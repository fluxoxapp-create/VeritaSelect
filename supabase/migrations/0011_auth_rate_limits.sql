-- Atomic, DB-backed rate limiting for auth endpoints (sign-in, password
-- recovery, re-authentication) that have no CDN/WAF brute-force protection
-- configured yet. Buckets are keyed by an arbitrary text key chosen by the
-- application (e.g. "sign_in:ip:203.0.113.4" or "sign_in:id:user@example.com")
-- with a fixed-window counter that resets once the window expires.

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  window_start timestamptz not null default now(),
  attempt_count integer not null default 0
);

alter table public.rate_limit_buckets enable row level security;

-- No direct table access for anyone — only the security definer function
-- below (owned by the migration role, running with elevated privilege) may
-- read or write buckets. This keeps clients from inflating/clearing their
-- own counters or reading others'.
revoke all on public.rate_limit_buckets from anon, authenticated;

create or replace function public.check_rate_limit(
  p_key text,
  p_max_attempts integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limit_buckets (bucket_key, window_start, attempt_count)
  values (p_key, now(), 1)
  on conflict (bucket_key) do update
    set attempt_count = case
          when public.rate_limit_buckets.window_start <= now() - make_interval(secs => p_window_seconds)
            then 1
          else public.rate_limit_buckets.attempt_count + 1
        end,
        window_start = case
          when public.rate_limit_buckets.window_start <= now() - make_interval(secs => p_window_seconds)
            then now()
          else public.rate_limit_buckets.window_start
        end
  returning attempt_count into v_count;

  return v_count <= p_max_attempts;
end;
$$;

-- Callable by the service-role connection the app uses for auth bookkeeping
-- (see is_admin()'s service_role recognition in migration 0009 for the same
-- pattern: privileged server-side operations run through the admin client).
revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
