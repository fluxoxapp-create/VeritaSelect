-- =========================================================
-- 0019 — Set security_invoker on raffles_public view
-- Ensures RLS is evaluated as the querying user, not the
-- view creator. Fixes Supabase security advisor warning.
-- =========================================================

alter view public.raffles_public set (security_invoker = true);
