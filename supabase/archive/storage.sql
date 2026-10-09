-- Storage: avatar + bank QR uploads.
-- - Adds avatar_url and bank_qr_url to public.users.
-- - Creates two public buckets ('avatars', 'bank-qr').
-- - Storage RLS: anyone can read; authenticated users can write only inside
--   a folder named after their auth.uid().
--
-- Idempotent: safe to re-run.

alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists bank_qr_url text;

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('bank-qr', 'bank-qr', true)
on conflict (id) do update set public = excluded.public;

-- Wipe any prior policies on these buckets to keep the script idempotent.
drop policy if exists "Avatars public read" on storage.objects;
drop policy if exists "Avatars owner insert" on storage.objects;
drop policy if exists "Avatars owner update" on storage.objects;
drop policy if exists "Avatars owner delete" on storage.objects;
drop policy if exists "BankQR public read" on storage.objects;
drop policy if exists "BankQR owner insert" on storage.objects;
drop policy if exists "BankQR owner update" on storage.objects;
drop policy if exists "BankQR owner delete" on storage.objects;

-- avatars
create policy "Avatars public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

create policy "Avatars owner insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Avatars owner update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Avatars owner delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- bank-qr
create policy "BankQR public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'bank-qr');

create policy "BankQR owner insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'bank-qr'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "BankQR owner update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'bank-qr'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'bank-qr'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "BankQR owner delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'bank-qr'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
