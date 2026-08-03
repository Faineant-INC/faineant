-- Public 'uploads' bucket: 8 MB/file, image mimes only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS on storage.objects is enabled by Supabase. Public read; owner-folder writes.
create policy "uploads_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'uploads');

create policy "uploads_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "uploads_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "uploads_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
