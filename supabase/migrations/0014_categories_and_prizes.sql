-- =========================================================
-- 1. Categories (replaces the hardcoded list in the app)
-- =========================================================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  icon        text not null default '🏆',
  keywords    text not null default '',   -- used for cover image search (loremflickr)
  display_order integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.categories enable row level security;

-- Everyone can read active categories
create policy "public read active categories" on public.categories
  for select using (is_active = true);

-- Service role only writes (admin page uses service_role via admin client)
revoke all on table public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;

-- Seed with existing hardcoded values
insert into public.categories (name, icon, keywords, display_order) values
  ('Agro',         '🚜', 'tractor,farm',         10),
  ('Caminhonetes', '🛻', 'pickup-truck,truck',    20),
  ('Motos',        '🏍', 'motorcycle',             30),
  ('Náutico',      '🚤', 'boat,yacht',             40),
  ('Automotivo',   '🚗', 'car,automobile',         50);

-- =========================================================
-- 2. Raffle prizes (lucky tickets / prêmios instantâneos)
-- =========================================================
create table public.raffle_prizes (
  id                uuid primary key default gen_random_uuid(),
  raffle_id         uuid not null references public.raffles(id) on delete cascade,
  prize_number      integer not null,                          -- which raffle_number wins
  prize_description text not null,
  reveal_at_pct     integer not null default 0
    check (reveal_at_pct in (0, 25, 50, 75, 100)),            -- reveal threshold
  is_revealed       boolean not null default false,
  winner_buyer_id   uuid references public.profiles(id),
  won_at            timestamptz,
  created_at        timestamptz not null default now(),
  constraint raffle_prize_number_unique unique (raffle_id, prize_number)
);

alter table public.raffle_prizes enable row level security;

-- Public: only revealed prizes are visible (hides unrevealed so buyers can't cherry-pick)
create policy "public read revealed prizes" on public.raffle_prizes
  for select to anon, authenticated
  using (is_revealed = true);

-- Organizers can read all prizes on their own raffles (including unrevealed)
create policy "organizer read own prizes" on public.raffle_prizes
  for select to authenticated
  using (
    exists (
      select 1 from public.raffles r
      where r.id = raffle_id and r.organizer_id = auth.uid()
    )
  );

-- Organizers can add prizes to draft raffles only
create policy "organizer insert prizes" on public.raffle_prizes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.raffles r
      where r.id = raffle_id
        and r.organizer_id = auth.uid()
        and r.status = 'draft'
    )
  );

-- Organizers can remove prizes from draft raffles only
create policy "organizer delete prizes" on public.raffle_prizes
  for delete to authenticated
  using (
    exists (
      select 1 from public.raffles r
      where r.id = raffle_id
        and r.organizer_id = auth.uid()
        and r.status = 'draft'
    )
  );

-- =========================================================
-- 3. Auto-reveal function — call after a purchase is confirmed
-- =========================================================
create or replace function public.reveal_prizes_for_raffle(p_raffle_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
  v_sold  integer;
  v_pct   integer;
begin
  select total_cotas into v_total from public.raffles where id = p_raffle_id;

  select count(*) into v_sold
  from public.raffle_numbers rn
  join public.compras c on c.id = rn.purchase_id
  where rn.raffle_id = p_raffle_id and c.status = 'paid';

  if v_total is null or v_total = 0 then return; end if;

  v_pct := floor((v_sold::numeric / v_total) * 100);

  update public.raffle_prizes
  set is_revealed = true
  where raffle_id = p_raffle_id
    and is_revealed = false
    and reveal_at_pct <= v_pct;
end;
$$;

revoke all on function public.reveal_prizes_for_raffle(uuid) from anon, authenticated;

-- =========================================================
-- 4. Check if a buyer's number is a winner (called on payment confirm)
-- =========================================================
create or replace function public.check_prize_winners(p_raffle_id uuid, p_compra_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.raffle_prizes rp
  set winner_buyer_id = c.buyer_id,
      won_at = now()
  from public.raffle_numbers rn
  join public.compras c on c.id = rn.purchase_id
  where rn.raffle_id = p_raffle_id
    and rn.purchase_id = p_compra_id
    and rp.raffle_id = p_raffle_id
    and rp.prize_number = rn.number
    and rp.winner_buyer_id is null;
end;
$$;

revoke all on function public.check_prize_winners(uuid, uuid) from anon, authenticated;
