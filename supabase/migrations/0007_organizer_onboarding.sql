-- Verita — safe self-service onboarding for organizers and raffle drafts.
--
-- Until now there was no INSERT policy on `organizers` (by design — comment in
-- 0001 says promotion is admin-only) and `raffles` had a blanket
-- `for all using (organizer_id = auth.uid())` policy that — combined with no
-- insert-time status check — would let an organizer INSERT a raffle directly
-- with status='published', bypassing review entirely (the 0004 trigger only
-- guards UPDATE).
--
-- This migration opens both flows back up *safely*:
--   • a buyer may create their OWN organizer row to request verification,
--     but only in the inert pre-review state (is_verified=false,
--     kyc_status in ('not_submitted','pending'), no review metadata)
--   • an organizer may create raffle drafts for themselves, but only with
--     status='draft' and no review metadata — exactly mirroring the
--     transition rules the 0004 update trigger already enforces.

-- =========================================================
-- organizers — self-service verification request
-- =========================================================
create policy "buyer requests organizer verification" on public.organizers
  for insert
  to authenticated
  with check (
    id = auth.uid()
    and is_verified = false
    and kyc_status in ('not_submitted', 'pending')
    and kyc_reviewed_by is null
    and kyc_reviewed_at is null
    and kyc_rejection_reason is null
  );

-- =========================================================
-- raffles — close the insert-time status bypass
-- =========================================================
-- Replace the single blanket policy with one per operation so INSERT can
-- carry its own `with check` (Postgres applies one `with check` per command,
-- and `for all` only allows a single combined expression).
drop policy if exists "organizer manages own raffles" on public.raffles;

create policy "organizer creates own raffle drafts" on public.raffles
  for insert
  to authenticated
  with check (
    organizer_id = auth.uid()
    and status = 'draft'
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
  );

create policy "organizer reads own raffles" on public.raffles
  for select
  to authenticated
  using (organizer_id = auth.uid());

create policy "organizer updates own raffles" on public.raffles
  for update
  to authenticated
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

create policy "organizer deletes own draft raffles" on public.raffles
  for delete
  to authenticated
  using (organizer_id = auth.uid() and status = 'draft');

-- Note: the 0004 `protect_raffle_status` trigger still governs which status
-- transitions an organizer's UPDATE may perform (draft -> pending_review only)
-- and locks reviewed_*/rejection_reason to admins — this policy only grants
-- the row-level access; the trigger remains the column-level guard.
