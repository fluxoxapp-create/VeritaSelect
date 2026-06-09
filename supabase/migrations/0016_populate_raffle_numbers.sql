-- Migration 0016: auto-populate raffle_numbers when a raffle is published
--
-- The reserve_raffle_numbers function expects pre-existing rows in raffle_numbers
-- (one row per cota, purchase_id = null). This migration:
--   1. Creates populate_raffle_numbers() to bulk-insert rows via generate_series
--   2. Adds a trigger on raffles so rows are generated on status → 'published'
--   3. Backfills any already-published raffles that have no numbers yet

-- ── 1. populate function ────────────────────────────────────────────────────

create or replace function public.populate_raffle_numbers(p_raffle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  select total_cotas into v_total
  from public.raffles
  where id = p_raffle_id;

  if v_total is null then
    raise exception 'Raffle not found: %', p_raffle_id;
  end if;

  -- Idempotent: skip if numbers already exist
  if exists (select 1 from public.raffle_numbers where raffle_id = p_raffle_id limit 1) then
    return;
  end if;

  insert into public.raffle_numbers (raffle_id, number)
  select p_raffle_id, n
  from generate_series(1, v_total) as n;
end;
$$;

-- Only service_role may call this directly (e.g. for manual backfills)
revoke all on function public.populate_raffle_numbers(uuid) from public, anon, authenticated;
grant execute on function public.populate_raffle_numbers(uuid) to service_role;

-- ── 2. trigger function ─────────────────────────────────────────────────────

create or replace function public.trigger_populate_raffle_numbers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Fire only on the first transition to 'published'
  if new.status = 'published' and (old.status is distinct from 'published') then
    perform public.populate_raffle_numbers(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists populate_raffle_numbers_on_publish on public.raffles;
create trigger populate_raffle_numbers_on_publish
  after update on public.raffles
  for each row
  execute function public.trigger_populate_raffle_numbers();

-- ── 3. backfill existing published / drawing raffles ────────────────────────

do $$
declare
  r record;
begin
  for r in
    select id
    from public.raffles
    where status in ('published', 'drawing')
      and not exists (
        select 1 from public.raffle_numbers where raffle_id = raffles.id limit 1
      )
  loop
    perform public.populate_raffle_numbers(r.id);
  end loop;
end;
$$;
