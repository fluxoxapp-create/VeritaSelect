-- Verita — Brazilian address fields on profiles.
-- Required for prize delivery (winners must receive physical items) and as an
-- extra antifraude signal (CPF + address consistency). Stored unmasked
-- (digits only for CEP, uppercase 2-letter UF) — formatting is a display concern.

alter table public.profiles
  add column cep text,
  add column logradouro text,
  add column numero text,
  add column complemento text,
  add column bairro text,
  add column cidade text,
  add column uf text,
  add constraint profiles_cep_format
    check (cep is null or cep ~ '^[0-9]{8}$'),
  add constraint profiles_uf_valid
    check (uf is null or uf in (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
      'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    ));

-- Extend the on-signup trigger (0003) to persist the address captured during
-- cadastro. CREATE OR REPLACE keeps the same trigger binding.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, cpf_hash, cpf_last4,
    cep, logradouro, numero, complemento, bairro, cidade, uf
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'cpf_hash', 'pending:' || new.id::text),
    coalesce(new.raw_user_meta_data ->> 'cpf_last4', ''),
    new.raw_user_meta_data ->> 'cep',
    new.raw_user_meta_data ->> 'logradouro',
    new.raw_user_meta_data ->> 'numero',
    new.raw_user_meta_data ->> 'complemento',
    new.raw_user_meta_data ->> 'bairro',
    new.raw_user_meta_data ->> 'cidade',
    new.raw_user_meta_data ->> 'uf'
  );

  insert into public.audit_log (actor_id, actor_role, action, target_table, target_id, metadata)
  values (new.id, 'buyer', 'profile.created', 'profiles', new.id, '{}'::jsonb);

  return new;
end;
$$;
