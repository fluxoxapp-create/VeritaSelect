-- Verita Sorteios Verificados — Phase 1 core schema
-- Profiles, organizers, raffles, raffle_numbers, compras, pagamentos,
-- webhook_events, ganhadores, audit_log + RLS.
--
-- This migration intentionally does NOT include application code (number
-- assignment / payment confirmation transactions). Those are implemented as
-- Postgres functions in 0002_purchase_transaction.sql so they can be reviewed
-- and tested independently.

-- =========================================================
-- EXTENSIONS
-- =========================================================
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =========================================================
-- ENUM TYPES
-- =========================================================
create type user_role as enum ('buyer', 'organizer', 'admin');
create type kyc_status as enum ('not_submitted', 'pending', 'approved', 'rejected');
create type raffle_status as enum ('draft', 'pending_review', 'published', 'paused', 'drawing', 'completed', 'cancelled');
create type purchase_status as enum ('pending_payment', 'paid', 'expired', 'cancelled', 'refunded', 'fraud_review');
create type payment_status as enum ('created', 'pending', 'paid', 'expired', 'failed', 'refunded', 'chargeback');
create type payment_method as enum ('pix');

-- =========================================================
-- PROFILES (1:1 with auth.users)
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'buyer',
  full_name text not null,
  cpf_hash text not null,
  cpf_last4 text not null,
  phone text,
  birth_date date,
  is_banned boolean not null default false,
  banned_reason text,
  banned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cpf_hash_unique unique (cpf_hash)
);

create index profiles_role_idx on public.profiles (role);

-- =========================================================
-- ORGANIZERS
-- =========================================================
create table public.organizers (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  document_type text not null check (document_type in ('cpf', 'cnpj')),
  document_number_hash text not null,
  kyc_status kyc_status not null default 'not_submitted',
  kyc_reviewed_by uuid references public.profiles(id),
  kyc_reviewed_at timestamptz,
  kyc_rejection_reason text,
  document_storage_paths jsonb not null default '[]'::jsonb,
  payout_pix_key_encrypted text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint document_number_unique unique (document_number_hash)
);

create index organizers_kyc_status_idx on public.organizers (kyc_status);

-- =========================================================
-- RAFFLES / SELEÇÕES
-- =========================================================
create table public.raffles (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('Agro','Caminhonetes','Motos','Náutico','Automotivo')),
  description text not null default '',
  cota_price_cents integer not null check (cota_price_cents > 0),
  total_cotas integer not null check (total_cotas > 0),
  draw_date date not null,
  status raffle_status not null default 'draft',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index raffles_organizer_idx on public.raffles (organizer_id);
create index raffles_status_idx on public.raffles (status);

-- =========================================================
-- COMPRAS / PEDIDOS
-- (created before raffle_numbers so the FK there can reference it directly)
-- =========================================================
create table public.compras (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  raffle_id uuid not null references public.raffles(id),
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents > 0),
  total_cents integer not null check (total_cents > 0),
  status purchase_status not null default 'pending_payment',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compras_buyer_idx on public.compras (buyer_id);
create index compras_raffle_idx on public.compras (raffle_id);
create index compras_status_idx on public.compras (status);

-- =========================================================
-- RAFFLE_NUMBERS / COTAS
-- =========================================================
create table public.raffle_numbers (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id),
  number integer not null check (number >= 0),
  purchase_id uuid references public.compras(id),
  reserved_until timestamptz,
  created_at timestamptz not null default now(),

  constraint raffle_number_unique unique (raffle_id, number)
);

create index raffle_numbers_raffle_idx on public.raffle_numbers (raffle_id);
create index raffle_numbers_purchase_idx on public.raffle_numbers (purchase_id);

-- =========================================================
-- PAGAMENTOS (Pix)
-- =========================================================
create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id),
  gateway text not null check (gateway in ('asaas', 'mercadopago')),
  gateway_payment_id text not null,
  method payment_method not null default 'pix',
  amount_cents integer not null check (amount_cents > 0),
  status payment_status not null default 'created',
  pix_qr_code text,
  pix_expiration timestamptz,
  paid_at timestamptz,
  raw_webhook_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint gateway_payment_unique unique (gateway, gateway_payment_id)
);

create index pagamentos_compra_idx on public.pagamentos (compra_id);
create index pagamentos_status_idx on public.pagamentos (status);

-- =========================================================
-- WEBHOOK_EVENTS — idempotency ledger
-- =========================================================
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  gateway text not null,
  event_id text not null,
  event_type text not null,
  signature_valid boolean not null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_result text,
  received_at timestamptz not null default now(),

  constraint webhook_event_unique unique (gateway, event_id)
);

create index webhook_events_processed_idx on public.webhook_events (processed_at);

-- =========================================================
-- GANHADORES / WINNERS
-- =========================================================
create table public.ganhadores (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id),
  raffle_number_id uuid not null references public.raffle_numbers(id),
  buyer_id uuid not null references public.profiles(id),
  prize_description text not null,
  drawn_number integer not null,
  draw_reference text,
  drawn_at timestamptz not null,
  announced_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),

  constraint ganhadores_raffle_unique unique (raffle_id)
);

-- =========================================================
-- AUDIT_LOG — append-only, immutable
-- =========================================================
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  actor_role user_role,
  actor_ip inet,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_idx on public.audit_log (actor_id);
create index audit_log_target_idx on public.audit_log (target_table, target_id);
create index audit_log_action_idx on public.audit_log (action);
create index audit_log_created_idx on public.audit_log (created_at desc);

revoke update, delete on public.audit_log from public, anon, authenticated;

create or replace function public.forbid_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

create trigger audit_log_no_update
  before update on public.audit_log
  for each row execute function public.forbid_audit_mutation();

create trigger audit_log_no_delete
  before delete on public.audit_log
  for each row execute function public.forbid_audit_mutation();

-- =========================================================
-- updated_at maintenance
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger organizers_set_updated_at before update on public.organizers
  for each row execute function public.set_updated_at();
create trigger raffles_set_updated_at before update on public.raffles
  for each row execute function public.set_updated_at();
create trigger compras_set_updated_at before update on public.compras
  for each row execute function public.set_updated_at();
create trigger pagamentos_set_updated_at before update on public.pagamentos
  for each row execute function public.set_updated_at();

-- =========================================================
-- ROLE-LOOKUP HELPERS (security definer, locked search_path)
-- =========================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- =========================================================
-- RLS
-- =========================================================
alter table public.profiles enable row level security;
alter table public.organizers enable row level security;
alter table public.raffles enable row level security;
alter table public.raffle_numbers enable row level security;
alter table public.compras enable row level security;
alter table public.pagamentos enable row level security;
alter table public.webhook_events enable row level security;
alter table public.ganhadores enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy "self read" on public.profiles
  for select using (id = auth.uid());
create policy "self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admin full read profiles" on public.profiles
  for select using (public.is_admin());
create policy "admin update profiles" on public.profiles
  for update using (public.is_admin());

-- a profile row is created by a trigger on auth.users sign-up (see 0003), not
-- by direct client insert — no insert policy for authenticated/anon.

-- organizers
create policy "organizer reads own" on public.organizers
  for select using (id = auth.uid());
create policy "organizer updates own pre-approval" on public.organizers
  for update using (id = auth.uid() and kyc_status in ('not_submitted', 'rejected'));
create policy "admin full access organizers" on public.organizers
  for all using (public.is_admin());
create policy "public sees verified organizers" on public.organizers
  for select using (is_verified = true);

-- raffles
create policy "public reads published raffles" on public.raffles
  for select using (status in ('published', 'drawing', 'completed'));
create policy "organizer manages own raffles" on public.raffles
  for all using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());
create policy "admin full access raffles" on public.raffles
  for all using (public.is_admin());

-- raffle_numbers — no insert/update policies for authenticated/anon;
-- assignment is exclusively a service-role transaction (0002).
create policy "buyer sees own numbers" on public.raffle_numbers
  for select using (
    purchase_id in (select id from public.compras where buyer_id = auth.uid())
  );
create policy "organizer sees numbers for own raffles" on public.raffle_numbers
  for select using (
    raffle_id in (select id from public.raffles where organizer_id = auth.uid())
  );
create policy "admin full access raffle_numbers" on public.raffle_numbers
  for all using (public.is_admin());

-- compras
create policy "buyer sees own purchases" on public.compras
  for select using (buyer_id = auth.uid());
create policy "buyer creates own pending purchase" on public.compras
  for insert with check (buyer_id = auth.uid() and status = 'pending_payment');
create policy "organizer sees purchases on own raffles" on public.compras
  for select using (
    raffle_id in (select id from public.raffles where organizer_id = auth.uid())
  );
create policy "admin full access compras" on public.compras
  for all using (public.is_admin());

-- pagamentos — read-only for buyer; all writes via service-role.
create policy "buyer sees own payments" on public.pagamentos
  for select using (
    compra_id in (select id from public.compras where buyer_id = auth.uid())
  );
create policy "admin full access pagamentos" on public.pagamentos
  for all using (public.is_admin());

-- webhook_events — service-role only, invisible to API roles entirely.
revoke all on public.webhook_events from anon, authenticated;

-- ganhadores — public read (trust/marketing page), writes via service-role/admin.
create policy "public reads winners" on public.ganhadores
  for select using (true);
create policy "admin full access ganhadores" on public.ganhadores
  for all using (public.is_admin());

-- audit_log — admin read-only; inserts exclusively via service-role.
create policy "admin reads audit log" on public.audit_log
  for select using (public.is_admin());
revoke insert, update, delete on public.audit_log from anon, authenticated;
