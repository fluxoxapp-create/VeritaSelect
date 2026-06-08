-- Verita — auto-create a `profiles` row whenever a new auth.users row appears.
-- Buyer is the default role; promotion to organizer/admin happens through
-- the admin panel (audited), never by client-controlled signup metadata.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, cpf_hash, cpf_last4)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'cpf_hash', 'pending:' || new.id::text),
    coalesce(new.raw_user_meta_data ->> 'cpf_last4', '')
  );

  insert into public.audit_log (actor_id, actor_role, action, target_table, target_id, metadata)
  values (new.id, 'buyer', 'profile.created', 'profiles', new.id, '{}'::jsonb);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Note: cpf_hash placeholder ('pending:<uuid>') keeps the unique constraint
-- satisfiable for accounts created before CPF capture in onboarding; the
-- application must update it (via service_role, with audit logging) once the
-- real hashed CPF is collected, and must refuse to let the buyer transact
-- (purchase insert policy) until cpf_hash no longer starts with 'pending:'.
-- Enforcing that refusal is application-layer work for the checkout flow,
-- tracked separately from this schema migration.
