-- Fixes for Supabase Advisor security findings
--
-- ERROR: security_definer_view — raffles_public, organizers_public, ganhadores_public
-- These views were implicitly SECURITY DEFINER (the default). They must be
-- SECURITY INVOKER so they respect RLS policies of the querying role, not the
-- definer. The column list already limits what's exposed; adding SECURITY INVOKER
-- makes that defense-in-depth rather than the only layer.
--
-- WARN: function_search_path_mutable — forbid_audit_mutation, set_updated_at
-- WARN: anon_security_definer_function_executable — trigger functions exposed via PostgREST
-- WARN: check_rate_limit callable by anon/authenticated via REST

-- =========================================================
-- 1. Recreate public views as SECURITY INVOKER
-- =========================================================
drop view if exists public.raffles_public;
drop view if exists public.ganhadores_public;
drop view if exists public.organizers_public;

create view public.raffles_public
  with (security_invoker = true)
as
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

create view public.ganhadores_public
  with (security_invoker = true)
as
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

-- organizers_public (if it exists from 0006)
create view public.organizers_public
  with (security_invoker = true)
as
select
  o.id,
  o.display_name,
  o.is_verified,
  o.kyc_status
from public.organizers o
where o.kyc_status = 'approved';

grant select on public.organizers_public to anon, authenticated;

-- =========================================================
-- 2. Add SET search_path to functions missing it
-- =========================================================
create or replace function public.forbid_audit_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  raise exception 'audit_log is append-only' using errcode = 'P0001';
end;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 3. Revoke PostgREST access to internal trigger/security functions
-- These are called only by triggers or service_role — never by end users.
-- =========================================================
revoke all on function public.handle_new_auth_user() from anon, authenticated;
revoke all on function public.is_admin() from anon, authenticated;
revoke all on function public.protect_organizer_fields() from anon, authenticated;
revoke all on function public.protect_profile_fields() from anon, authenticated;
revoke all on function public.protect_raffle_status() from anon, authenticated;
revoke all on function public.forbid_audit_mutation() from anon, authenticated;
revoke all on function public.set_updated_at() from anon, authenticated;

-- check_rate_limit should only be callable by service_role (the Next.js server)
revoke all on function public.check_rate_limit(text, integer, integer) from anon, authenticated;
