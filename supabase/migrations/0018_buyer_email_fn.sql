-- =========================================================
-- 0018 — Secure function to look up buyer emails from auth.users
-- Called by admin panel only (service_role via RPC)
-- =========================================================

create or replace function public.get_buyer_emails(buyer_ids uuid[])
returns table(id uuid, email text)
language sql
security definer
stable
set search_path = public
as $$
  select u.id, u.email::text
  from auth.users u
  where u.id = any(buyer_ids);
$$;

-- Only service_role (admin client) may call this function.
-- Revoke public/authenticated execute to prevent leakage.
revoke execute on function public.get_buyer_emails(uuid[]) from public, anon, authenticated;
grant  execute on function public.get_buyer_emails(uuid[]) to service_role;
