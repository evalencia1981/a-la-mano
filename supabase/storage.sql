-- ============================================================================
-- A la Mano — Supabase Storage
--
-- Bucket único `providers-photos` para la galería de fotos de proveedores.
-- Estructura: {providerId}/{uuid}.webp
--
-- Las fotos se procesan server-side con sharp (resize 1920x1080 max, WebP
-- calidad 85) antes de subirlas — ver provider-photo.service.ts.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'providers-photos',
  'providers-photos',
  true,
  5242880, -- 5 MB
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Policies del bucket
-- ----------------------------------------------------------------------------

drop policy if exists "auth upload provider photos" on storage.objects;
create policy "auth upload provider photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'providers-photos');

drop policy if exists "public read provider photos" on storage.objects;
create policy "public read provider photos" on storage.objects
  for select to public
  using (bucket_id = 'providers-photos');

drop policy if exists "auth delete provider photos" on storage.objects;
create policy "auth delete provider photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'providers-photos' and owner = auth.uid());

drop policy if exists "auth update provider photos" on storage.objects;
create policy "auth update provider photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'providers-photos' and owner = auth.uid());
