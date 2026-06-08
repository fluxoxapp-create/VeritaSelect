-- Verita — recognize the service-role connection as admin for trigger checks.
--
-- The super-admin panel uses a separate HMAC-cookie session (no Supabase Auth
-- account, no `profiles.id`), so its server actions run through
-- `createSupabaseAdminClient()` (the service-role key). `auth.uid()` is null
-- on that connection, so `is_admin()` returned false — meaning the 0004/0008
-- column-locking triggers (`protect_organizer_fields`, `protect_raffle_status`,
-- `protect_profile_fields`) treated admin-panel updates (approve/reject,
-- is_verified, kyc_status, review metadata) as ordinary user edits and
-- raised on them.
--
-- The service-role key is only ever used from trusted server-side code
-- (admin panel actions, webhooks, purchase transactions — see the comment on
-- createSupabaseAdminClient), so it is safe to treat it as admin here.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'service_role'
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
