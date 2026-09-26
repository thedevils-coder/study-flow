-- Additive Leo / AI Meter tracking: distinguish successful generations, record
-- provider metadata, and store generated image/PDF artifacts. Existing rows stay
-- intact and are treated as successful usage.

alter table public.ai_generations
  add column if not exists status text not null default 'success',
  add column if not exists provider text,
  add column if not exists grounded boolean not null default false,
  add column if not exists latency_ms integer;

update public.ai_generations
  set status = 'success'
  where status is null or status = '';

alter table public.ai_generations drop constraint if exists ai_generations_status_check;
alter table public.ai_generations
  add constraint ai_generations_status_check
  check (status in ('success', 'failed', 'error'));

create index if not exists ai_generations_user_success_created_idx
  on public.ai_generations (user_id, created_at desc)
  where status = 'success';

insert into storage.buckets (id, name, public)
values ('ai-artifacts', 'ai-artifacts', false)
on conflict (id) do nothing;

drop policy if exists "read own ai artifacts" on storage.objects;
create policy "read own ai artifacts"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'ai-artifacts' and split_part(name, '/', 1) = (select auth.uid())::text);

drop policy if exists "upload own ai artifacts" on storage.objects;
create policy "upload own ai artifacts"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'ai-artifacts' and split_part(name, '/', 1) = (select auth.uid())::text);

drop policy if exists "delete own ai artifacts" on storage.objects;
create policy "delete own ai artifacts"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'ai-artifacts' and split_part(name, '/', 1) = (select auth.uid())::text);
