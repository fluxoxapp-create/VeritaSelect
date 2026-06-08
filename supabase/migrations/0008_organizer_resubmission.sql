-- Verita — allow organizers to correct their document and clear the
-- rejection reason when resubmitting for verification.
--
-- The 0004 `protect_organizer_fields` trigger locks `document_number_hash`
-- forever and blocks any non-admin change to `kyc_rejection_reason`. That
-- makes sense for an approved/pending organizer, but it also blocks the
-- legitimate resubmission flow: a rejected organizer must be able to fix a
-- wrong CPF/CNPJ and have the old rejection reason cleared when they
-- transition back from rejected -> pending.

create or replace function public.protect_organizer_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_resubmission boolean;
begin
  is_resubmission := old.kyc_status = 'rejected' and new.kyc_status = 'pending';

  if not public.is_admin() then
    if new.is_verified <> old.is_verified then
      raise exception 'only admins can verify an organizer';
    end if;
    if new.kyc_status <> old.kyc_status
      and not (old.kyc_status in ('not_submitted', 'rejected') and new.kyc_status = 'pending') then
      raise exception 'organizers may only submit for review (status -> pending)';
    end if;
    if new.kyc_reviewed_by is distinct from old.kyc_reviewed_by
      or new.kyc_reviewed_at is distinct from old.kyc_reviewed_at then
      raise exception 'only admins can set KYC review metadata';
    end if;
    if new.kyc_rejection_reason is distinct from old.kyc_rejection_reason
      and not (is_resubmission and new.kyc_rejection_reason is null) then
      raise exception 'only admins can set KYC review metadata';
    end if;
    if new.document_number_hash <> old.document_number_hash and not is_resubmission then
      raise exception 'document number cannot be changed once set';
    end if;
  end if;
  return new;
end;
$$;
