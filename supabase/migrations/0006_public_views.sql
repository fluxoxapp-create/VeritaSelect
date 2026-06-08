-- Verita — public read views for the storefront.
--
-- The storefront (home, /sorteios, /sorteio/[slug], /ganhadores) needs
-- aggregated, privacy-safe reads that the base-table RLS policies correctly
-- refuse to anon/authenticated directly:
--   • "sold cotas" requires counting `raffle_numbers` joined to `compras`,
--     but raffle_numbers has no public read policy (it would expose which
--     specific numbers belong to which purchase).
--   • winner display requires the buyer's name/city, but `profiles` is
--     self-read-only.
--
-- Both views below are owned by the migration role (not security_invoker),
-- so they run with the definer's privileges — the column list IS the access
-- boundary: only safe, aggregated/redacted fields are ever selected.

-- =========================================================
-- raffles_public — published raffles with organizer info + live sold count
-- =========================================================
create view public.raffles_public as
select
  r.id,
  r.slug,
  r.title,
  r.category,
  r.description,
  r.cota_price_cents,
  r.total_cotas,
  r.draw_date,
  r.status,
  o.id as organizer_id,
  o.display_name as organizer_name,
  o.is_verified as organizer_verified,
  coalesce(sold.sold_cotas, 0)::integer as sold_cotas
from public.raffles r
join public.organizers o on o.id = r.organizer_id
left join lateral (
  select count(*) as sold_cotas
  from public.raffle_numbers rn
  join public.compras c on c.id = rn.purchase_id
  where rn.raffle_id = r.id and c.status = 'paid'
) sold on true
where r.status = 'published';

grant select on public.raffles_public to anon, authenticated;

-- =========================================================
-- ganhadores_public — winners with a redacted display name
-- (first name + last initial, e.g. "Carlos E.") and city/state only —
-- never the full name, CPF, or any other profile field.
-- =========================================================
create view public.ganhadores_public as
select
  g.id,
  g.raffle_id,
  r.slug as raffle_slug,
  r.title as raffle_title,
  r.category as raffle_category,
  g.prize_description,
  g.drawn_number,
  g.drawn_at,
  trim(
    split_part(p.full_name, ' ', 1)
    || case
         when split_part(p.full_name, ' ', 2) <> ''
           then ' ' || left(split_part(p.full_name, ' ', 2), 1) || '.'
         else ''
       end
  ) as winner_display_name,
  p.cidade as winner_cidade,
  p.uf as winner_uf
from public.ganhadores g
join public.raffles r on r.id = g.raffle_id
join public.profiles p on p.id = g.buyer_id;

grant select on public.ganhadores_public to anon, authenticated;
