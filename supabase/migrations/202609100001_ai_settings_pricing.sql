-- Additive production schema: AI history, settings fields, indexes, profile update RLS,
-- and Basic/Pro display defaults. Existing rows and historical dates are not rewritten.

alter table public.pricing_config
  add column if not exists yearly_price integer not null default 1000,
  add column if not exists pro_monthly_price integer not null default 299,
  add column if not exists pro_yearly_price integer not null default 2500;

update public.pricing_config
  set yearly_price = 1000,
      pro_monthly_price = 299,
      pro_yearly_price = 2500,
      monthly_price = 99,
      trial_price = 0,
      trial_days = 15
  where region = 'IN';

alter table public.user_settings
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists study_reminders boolean not null default true,
  add column if not exists goal_reminders boolean not null default true,
  add column if not exists ai_context_enabled boolean not null default true,
  add column if not exists focus_minutes integer not null default 25;

alter table public.subscriptions
  add column if not exists entitlement_ids text[] not null default '{}'::text[];

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('notes','summary','flashcards','quiz','explain','leo','schedule','other')),
  prompt text not null check (char_length(prompt) between 1 and 8000),
  result_text text,
  result_meta jsonb not null default '{}'::jsonb,
  model text,
  tokens_used integer,
  created_at timestamptz not null default now()
);

alter table public.ai_generations enable row level security;

drop policy if exists "manage own ai generations" on public.ai_generations;
create policy "manage own ai generations"
  on public.ai_generations
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke update (role) on table public.profiles from authenticated, anon;

create index if not exists study_tasks_user_scheduled_idx
  on public.study_tasks (user_id, scheduled_at);

create index if not exists study_tasks_user_completed_idx
  on public.study_tasks (user_id, completed_at);

create index if not exists focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at);

create index if not exists study_goals_user_due_idx
  on public.study_goals (user_id, due_at);

create index if not exists ai_generations_user_created_idx
  on public.ai_generations (user_id, created_at desc);

create index if not exists subscriptions_state_idx
  on public.subscriptions (state);
