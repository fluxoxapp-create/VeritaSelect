  -- Verita — Phase 1 RLS hardening
  -- Fixes four privilege-escalation gaps found by the red-team audit of 0001:
  --   1. profiles self-update could change role/is_banned/cpf_* (→ self-promote to admin)
  --   2. organizers self-update could set is_verified/kyc_status (→ skip KYC review)
  --   3. public organizer policy leaked KYC/financial columns (row-level, not column-level)
  --   4. organizers could move raffles straight to 'published' (→ self-publish, skip review)
  --
  -- Approach: RLS policies are row-level, not column-level, so "which columns can
  -- change" is enforced with BEFORE UPDATE triggers that compare OLD vs NEW and
  -- raise on any attempt to touch a privileged field — unless the actor is_admin().

  -- =========================================================
  -- 1. profiles — lock role / ban status / CPF to admin-only changes
  -- =========================================================
  create or replace function public.protect_profile_fields()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    if not public.is_admin() then
      if new.role <> old.role then
        raise exception 'only admins can change role';
      end if;
      if new.is_banned <> old.is_banned
        or new.banned_reason is distinct from old.banned_reason
        or new.banned_at is distinct from old.banned_at then
        raise exception 'only admins can change ban status';
      end if;
      if new.cpf_hash <> old.cpf_hash or new.cpf_last4 <> old.cpf_last4 then
        raise exception 'cpf cannot be changed once set';
      end if;
    end if;
    return new;
  end;
  $$;

  create trigger profiles_protect_fields
    before update on public.profiles
    for each row execute function public.protect_profile_fields();

  -- =========================================================
  -- 2. organizers — lock verification/KYC-review fields to admin-only changes;
  --    organizers may still submit for review (not_submitted/rejected → pending)
  --    and update their own display/document/payout fields pre-approval.
  -- =========================================================
  create or replace function public.protect_organizer_fields()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    if not public.is_admin() then
      if new.is_verified <> old.is_verified then
        raise exception 'only admins can verify an organizer';
      end if;
      if new.kyc_status <> old.kyc_status
        and not (old.kyc_status in ('not_submitted', 'rejected') and new.kyc_status = 'pending') then
        raise exception 'organizers may only submit for review (status -> pending)';
      end if;
      if new.kyc_reviewed_by is distinct from old.kyc_reviewed_by
        or new.kyc_reviewed_at is distinct from old.kyc_reviewed_at
        or new.kyc_rejection_reason is distinct from old.kyc_rejection_reason then
        raise exception 'only admins can set KYC review metadata';
      end if;
      if new.document_number_hash <> old.document_number_hash then
        raise exception 'document number cannot be changed once set';
      end if;
    end if;
    return new;
  end;
  $$;

  create trigger organizers_protect_fields
    before update on public.organizers
    for each row execute function public.protect_organizer_fields();

  -- =========================================================
  -- 3. organizers — replace the row-level "public sees verified organizers"
  --    policy (which leaked every column) with a column-restricted view.
  -- =========================================================
  drop policy if exists "public sees verified organizers" on public.organizers;

  create view public.organizers_public as
    select id, display_name, is_verified, created_at
    from public.organizers
    where is_verified = true;

  -- Deliberately NOT security_invoker: this view runs with the definer's
  -- privileges so it can select the safe columns regardless of the base table's
  -- RLS, while the column list itself is the access boundary — KYC/payout/
  -- document fields are simply never selected, so they can never leak through it.
  grant select on public.organizers_public to anon, authenticated;

  -- =========================================================
  -- 4. raffles — restrict organizer-driven status transitions.
  --    Organizers may only move draft -> pending_review (request review);
  --    every other transition (-> published, paused, drawing, completed,
  --    cancelled, or back to draft) and all reviewed_*/rejection_reason
  --    fields are admin-only.
  -- =========================================================
  create or replace function public.protect_raffle_status()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    if not public.is_admin() then
      if new.status <> old.status
        and not (old.status = 'draft' and new.status = 'pending_review') then
        raise exception 'organizers may only request review (draft -> pending_review)';
      end if;
      if new.reviewed_by is distinct from old.reviewed_by
        or new.reviewed_at is distinct from old.reviewed_at
        or new.rejection_reason is distinct from old.rejection_reason then
        raise exception 'only admins can set review metadata';
      end if;
    end if;
    return new;
  end;
  $$;

  create trigger raffles_protect_status
    before update on public.raffles
    for each row execute function public.protect_raffle_status();
