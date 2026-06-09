-- Fields for recording the official lottery draw result on a raffle
alter table public.raffles
  add column if not exists lottery_concurso     text,          -- e.g. "6001"
  add column if not exists lottery_result_number text,         -- full 5-digit result, e.g. "04821"
  add column if not exists winning_cota_number  integer;       -- actual cota that won

-- Function: given the official lottery result, find the winning cota number
-- and insert into ganhadores. Returns the winning cota number.
create or replace function public.register_draw_result(
  p_raffle_id          uuid,
  p_lottery_result     text,   -- full 5-digit result from Loteria Federal
  p_lottery_concurso   text
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_total         integer;
  v_digits        integer;
  v_base          integer;
  v_candidate     integer;
  v_winner_buyer  uuid;
  v_attempts      integer := 0;
  v_max_attempts  integer;
begin
  select total_cotas into v_total
  from public.raffles where id = p_raffle_id;

  if v_total is null then
    raise exception 'Raffle not found';
  end if;

  -- Determine how many digits of the lottery result to use
  v_digits := case
    when v_total <= 100    then 2
    when v_total <= 1000   then 3
    when v_total <= 10000  then 4
    else 5
  end;

  -- Extract the last v_digits digits of the result as integer
  v_base := (substring(p_lottery_result from (length(p_lottery_result) - v_digits + 1)))::integer;

  -- Clamp to valid range: numbers are stored 1..total_cotas
  -- v_base is 0..(10^digits - 1). Map 0 → total_cotas, otherwise use as-is.
  v_candidate := case when v_base = 0 then v_total else v_base end;

  v_max_attempts := v_total;

  -- Walk forward from v_candidate until we find a paid cota
  loop
    select c.buyer_id into v_winner_buyer
    from public.raffle_numbers rn
    join public.compras c on c.id = rn.purchase_id
    where rn.raffle_id = p_raffle_id
      and rn.number = v_candidate
      and c.status = 'paid'
    limit 1;

    exit when v_winner_buyer is not null;

    v_attempts := v_attempts + 1;
    if v_attempts >= v_max_attempts then
      raise exception 'No paid cota found after % attempts', v_max_attempts;
    end if;

    -- Wrap around
    v_candidate := (v_candidate % v_total) + 1;
  end loop;

  -- Record result on the raffle
  update public.raffles
  set lottery_concurso     = p_lottery_concurso,
      lottery_result_number = p_lottery_result,
      winning_cota_number  = v_candidate,
      status               = 'completed'
  where id = p_raffle_id;

  -- Insert into ganhadores (ignore if already exists)
  insert into public.ganhadores (raffle_id, buyer_id, drawn_number, drawn_at, prize_description)
  select
    p_raffle_id,
    v_winner_buyer,
    v_candidate,
    now(),
    r.title
  from public.raffles r
  where r.id = p_raffle_id
  on conflict do nothing;

  -- Reveal all remaining hidden prizes
  update public.raffle_prizes
  set is_revealed = true
  where raffle_id = p_raffle_id and is_revealed = false;

  return v_candidate;
end;
$$;

revoke all on function public.register_draw_result(uuid, text, text) from anon, authenticated;
