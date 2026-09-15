-- Additive rebuild schema. Existing rows are not rewritten.
-- Depends on: 202608080001_study_flow.sql, 202608110003_study_data.sql, 202609100001_ai_settings_pricing.sql

alter table public.focus_sessions
  add column if not exists session_type text not null default 'focus';

alter table public.focus_sessions
  drop constraint if exists focus_sessions_session_type_check;

alter table public.focus_sessions
  add constraint focus_sessions_session_type_check
  check (session_type in ('focus', 'short_break', 'long_break'));

create unique index if not exists focus_sessions_user_started_uidx
  on public.focus_sessions (user_id, started_at);

alter table public.user_settings
  add column if not exists task_reminders boolean not null default true;

create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text not null
);

insert into public.achievements (id, title, description) values
  ('first_focus', 'First Focus', 'Complete your first focus session.'),
  ('study_starter', 'Study Starter', 'Study for 5 hours.'),
  ('consistent', 'Consistent', 'Study on 5 different days.'),
  ('focus_master', 'Focus Master', 'Complete 25 focus sessions.'),
  ('goal_crusher', 'Goal Crusher', 'Complete a goal.')
on conflict (id) do update
  set title = excluded.title,
      description = excluded.description;

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists "read achievements" on public.achievements;
create policy "read achievements"
  on public.achievements
  for select
  to authenticated
  using (true);

drop policy if exists "manage own user achievements" on public.user_achievements;
create policy "manage own user achievements"
  on public.user_achievements
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists user_achievements_user_idx
  on public.user_achievements (user_id, earned_at desc);
