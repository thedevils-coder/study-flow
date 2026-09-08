-- User-owned study data. Every policy is scoped to the authenticated owner.
create table public.study_tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160), scheduled_at timestamptz, duration_minutes integer,
  category text not null default 'study' check (category in ('study','break','focus')), completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.study_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160), target_value integer not null check (target_value > 0), current_value integer not null default 0 check (current_value >= 0), unit text not null default 'hours', due_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null, ended_at timestamptz not null, duration_seconds integer not null check (duration_seconds > 0), created_at timestamptz not null default now()
);
create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade, language text not null default 'en', theme text not null default 'light', focus_mode text not null default 'balanced', reminders jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
alter table public.study_tasks enable row level security; alter table public.study_goals enable row level security; alter table public.focus_sessions enable row level security; alter table public.user_settings enable row level security;
create policy "manage own tasks" on public.study_tasks for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "manage own goals" on public.study_goals for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "manage own sessions" on public.focus_sessions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "manage own settings" on public.user_settings for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
