-- Private profile photos. Existing profile and subscription rows are left unchanged.

alter table public.profiles
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists "read own avatars" on storage.objects;
create policy "read own avatars"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

drop policy if exists "upload own avatars" on storage.objects;
create policy "upload own avatars"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

drop policy if exists "update own avatars" on storage.objects;
create policy "update own avatars"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

drop policy if exists "delete own avatars" on storage.objects;
create policy "delete own avatars"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);
