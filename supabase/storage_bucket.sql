-- Run this in Supabase SQL Editor to create the storage bucket for product images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kasaja-media',
  'kasaja-media',
  true,
  10485760,  -- 10MB limit
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "auth upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kasaja-media');

-- Allow public read
create policy "public read media" on storage.objects
  for select to public
  using (bucket_id = 'kasaja-media');

-- Allow users to delete their own uploads
create policy "owner delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'kasaja-media' and auth.uid()::text = (storage.foldername(name))[1]);

select 'storage bucket ready' as status;
