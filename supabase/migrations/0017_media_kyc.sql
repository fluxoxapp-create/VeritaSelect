-- =========================================================
-- 0017 — Media (photos + videos) + KYC identity verification
-- =========================================================

-- ── 1. Raffle media columns ──────────────────────────────────────────────────

alter table public.raffles
  add column if not exists photo_paths       text[]   not null default '{}',
  add column if not exists proof_photo_paths text[]   not null default '{}',
  add column if not exists video_presentation_url text,
  add column if not exists video_25_url           text,
  add column if not exists video_50_url           text,
  add column if not exists video_75_url           text,
  add column if not exists video_100_url          text;

-- ── 2. Organizer KYC identity columns ───────────────────────────────────────

alter table public.organizers
  add column if not exists kyc_selfie_path    text,
  add column if not exists kyc_doc_front_path text,
  add column if not exists kyc_doc_back_path  text,
  add column if not exists kyc_submitted_at   timestamptz;

-- ── 3. Storage buckets ───────────────────────────────────────────────────────
-- raffle-photos : public read, max 5 MB, images only (no SVG)
-- raffle-proof  : private,     max 10 MB, images only
-- kyc-docs      : private,     max 10 MB, images only
-- Buckets are idempotent — skip if they already exist.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('raffle-photos', 'raffle-photos', true,  5242880,  array['image/jpeg','image/png','image/webp']),
  ('raffle-proof',  'raffle-proof',  false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('kyc-docs',      'kyc-docs',      false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- ── 4. Storage RLS policies ──────────────────────────────────────────────────

-- ── raffle-photos ────────────────────────────────────────────────────────────

-- Anyone can view product photos (public storefront)
create policy "public read raffle photos"
  on storage.objects for select
  using (bucket_id = 'raffle-photos');

-- Organizer may upload to {raffle_id}/{filename} for their own raffle
create policy "organizer upload raffle photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'raffle-photos'
    and exists (
      select 1 from public.raffles r
      where r.id::text = (storage.foldername(name))[1]
        and r.organizer_id = auth.uid()
    )
  );

-- Organizer may delete photos for their own raffle
create policy "organizer delete raffle photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'raffle-photos'
    and exists (
      select 1 from public.raffles r
      where r.id::text = (storage.foldername(name))[1]
        and r.organizer_id = auth.uid()
    )
  );

-- ── raffle-proof ─────────────────────────────────────────────────────────────
-- Proof photos are never public — only service_role (admin) reads them.

create policy "organizer upload proof photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'raffle-proof'
    and exists (
      select 1 from public.raffles r
      where r.id::text = (storage.foldername(name))[1]
        and r.organizer_id = auth.uid()
    )
  );

create policy "organizer delete proof photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'raffle-proof'
    and exists (
      select 1 from public.raffles r
      where r.id::text = (storage.foldername(name))[1]
        and r.organizer_id = auth.uid()
    )
  );

-- ── kyc-docs ─────────────────────────────────────────────────────────────────
-- KYC docs: organizer uploads their own; service_role reads (admin panel).
-- Path must be {auth.uid()}/{filename} so one organizer can't overwrite another's.

create policy "organizer upload kyc docs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'kyc-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "organizer read own kyc docs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'kyc-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Organizer may re-upload (delete) their own KYC docs before approval
create policy "organizer delete own kyc docs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'kyc-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 5. Update raffles_public view to expose media fields ─────────────────────
-- DROP first because CREATE OR REPLACE cannot reorder existing columns.

drop view if exists public.raffles_public;

create view public.raffles_public as
select
  r.id,
  r.slug,
  r.title,
  r.category,
  r.description,
  r.cota_price_cents,
  r.total_cotas,
  r.draw_date,
  r.status,
  r.photo_paths,
  r.video_presentation_url,
  r.video_25_url,
  r.video_50_url,
  r.video_75_url,
  r.video_100_url,
  o.id   as organizer_id,
  o.display_name as organizer_name,
  o.is_verified  as organizer_verified,
  coalesce(sold.sold_cotas, 0)::integer as sold_cotas
from public.raffles r
join public.organizers o on o.id = r.organizer_id
left join lateral (
  select count(*) as sold_cotas
  from public.raffle_numbers rn
  join public.compras c on c.id = rn.purchase_id
  where rn.raffle_id = r.id and c.status = 'paid'
) sold on true
where r.status = 'published';

grant select on public.raffles_public to anon, authenticated;
