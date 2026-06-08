-- Verita — let organizers clear `rejection_reason` when resubmitting a
-- rejected raffle for review (draft -> pending_review), mirroring the
-- 0008 fix for organizer KYC resubmission.
--
-- Admin rejection sends a raffle back to status='draft' with
-- `rejection_reason` populated (there is no separate "rejected" raffle
-- status — see raffle_status enum). Without this change, the organizer
-- could resubmit (draft -> pending_review, already allowed) but the old
-- rejection reason would remain stuck forever, since `protect_raffle_status`
-- blocks any non-admin change to `rejection_reason`.

create or replace function public.protect_raffle_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_resubmission boolean;
begin
  is_resubmission := old.status = 'draft' and new.status = 'pending_review';

  if not public.is_admin() then
    if new.status <> old.status and not is_resubmission then
      raise exception 'organizers may only request review (draft -> pending_review)';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'only admins can set review metadata';
    end if;
    if new.rejection_reason is distinct from old.rejection_reason
      and not (is_resubmission and new.rejection_reason is null) then
      raise exception 'only admins can set review metadata';
    end if;
  end if;
  return new;
end;
$$;
