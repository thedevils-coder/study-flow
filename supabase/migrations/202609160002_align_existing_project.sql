-- Idempotent alignment for the existing Studyflow Supabase project.
-- Safe to apply when earlier rebuild migrations were only partially present.
-- Does not drop data, disable RLS, or grant extra privileges.

do $$ begin
  create type public.app_role as enum ('user', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_state as enum (
    'none', 'active', 'ending', 'pending', 'failed', 'cancelled', 'expired', 'refunded'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  role public.app_role not null default 'user',
  language text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null default 'revenuecat',
  entitlement_id text,
  product_id text,
  state text not null default 'none',
  expires_at timestamptz,
  will_renew boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_config (
  region text primary key default 'IN',
  currency text not null default 'INR',
  trial_price integer not null default 0,
  trial_days integer not null default 15,
  monthly_price integer not null default 99,
  yearly_price integer not null default 1000,
  pro_monthly_price integer not null default 299,
  pro_yearly_price integer not null default 2500,
  updated_at timestamptz not null default now()
);

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  scheduled_at timestamptz,
  duration_minutes integer,
  category text not null default 'study' check (category in ('study','break','focus')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  target_value integer not null check (target_value > 0),
  current_value integer not null default 0 check (current_value >= 0),
  unit text not null default 'hours',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  language text not null default 'en',
  updated_at timestamptz not null default now()
);

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

create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text not null
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.subscriptions add column if not exists entitlement_ids text[] not null default '{}'::text[];
alter table public.subscriptions add column if not exists provider text not null default 'revenuecat';
alter table public.subscriptions add column if not exists entitlement_id text;
alter table public.subscriptions add column if not exists product_id text;
alter table public.subscriptions add column if not exists expires_at timestamptz;
alter table public.subscriptions add column if not exists will_renew boolean not null default false;
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();

alter table public.pricing_config add column if not exists yearly_price integer not null default 1000;
alter table public.pricing_config add column if not exists pro_monthly_price integer not null default 299;
alter table public.pricing_config add column if not exists pro_yearly_price integer not null default 2500;
alter table public.pricing_config add column if not exists monthly_price integer not null default 99;
alter table public.pricing_config add column if not exists trial_price integer not null default 0;
alter table public.pricing_config add column if not exists trial_days integer not null default 15;
alter table public.pricing_config add column if not exists currency text not null default 'INR';

alter table public.user_settings add column if not exists language text not null default 'en';
alter table public.user_settings add column if not exists theme text not null default 'system';
alter table public.user_settings add column if not exists focus_mode text not null default 'balanced';
alter table public.user_settings add column if not exists reminders jsonb not null default '{}'::jsonb;
alter table public.user_settings add column if not exists notifications_enabled boolean not null default true;
alter table public.user_settings add column if not exists study_reminders boolean not null default true;
alter table public.user_settings add column if not exists goal_reminders boolean not null default true;
alter table public.user_settings add column if not exists task_reminders boolean not null default true;
alter table public.user_settings add column if not exists ai_context_enabled boolean not null default true;
alter table public.user_settings add column if not exists focus_minutes integer not null default 25;
alter table public.user_settings add column if not exists updated_at timestamptz not null default now();

alter table public.focus_sessions add column if not exists session_type text not null default 'focus';

alter table public.focus_sessions drop constraint if exists focus_sessions_session_type_check;
alter table public.focus_sessions
  add constraint focus_sessions_session_type_check
  check (session_type in ('focus', 'short_break', 'long_break'));

insert into public.pricing_config (
  region, currency, trial_price, trial_days, monthly_price, yearly_price, pro_monthly_price, pro_yearly_price
) values ('IN', 'INR', 0, 15, 99, 1000, 299, 2500)
on conflict (region) do update
  set currency = excluded.currency,
      trial_price = excluded.trial_price,
      trial_days = excluded.trial_days,
      monthly_price = excluded.monthly_price,
      yearly_price = excluded.yearly_price,
      pro_monthly_price = excluded.pro_monthly_price,
      pro_yearly_price = excluded.pro_yearly_price,
      updated_at = now();

insert into public.achievements (id, title, description) values
  ('first_focus', 'First Focus', 'Complete your first focus session.'),
  ('study_starter', 'Study Starter', 'Study for 5 hours.'),
  ('consistent', 'Consistent', 'Study on 5 different days.'),
  ('focus_master', 'Focus Master', 'Complete 25 focus sessions.'),
  ('goal_crusher', 'Goal Crusher', 'Complete a goal.')
on conflict (id) do update
  set title = excluded.title,
      description = excluded.description;

insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), nullif(split_part(u.email, '@', 1), ''), 'Student')
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.pricing_config enable row level security;
alter table public.study_tasks enable row level security;
alter table public.study_goals enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.user_settings enable row level security;
alter table public.ai_generations enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "read pricing" on public.pricing_config;
create policy "read pricing" on public.pricing_config
  for select to authenticated
  using (true);

drop policy if exists "manage own tasks" on public.study_tasks;
create policy "manage own tasks" on public.study_tasks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "manage own goals" on public.study_goals;
create policy "manage own goals" on public.study_goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "manage own sessions" on public.focus_sessions;
create policy "manage own sessions" on public.focus_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "manage own settings" on public.user_settings;
create policy "manage own settings" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "manage own ai generations" on public.ai_generations;
create policy "manage own ai generations" on public.ai_generations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "read achievements" on public.achievements;
create policy "read achievements" on public.achievements
  for select to authenticated
  using (true);

drop policy if exists "manage own user achievements" on public.user_achievements;
create policy "manage own user achievements" on public.user_achievements
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

do $$
begin
  revoke update (role) on table public.profiles from authenticated, anon;
exception
  when undefined_column then null;
  when undefined_table then null;
end $$;

create index if not exists study_tasks_user_scheduled_idx on public.study_tasks (user_id, scheduled_at);
create index if not exists study_tasks_user_completed_idx on public.study_tasks (user_id, completed_at);
create index if not exists focus_sessions_user_started_idx on public.focus_sessions (user_id, started_at);
create index if not exists study_goals_user_due_idx on public.study_goals (user_id, due_at);
create index if not exists ai_generations_user_created_idx on public.ai_generations (user_id, created_at desc);
create index if not exists subscriptions_state_idx on public.subscriptions (state);
create index if not exists user_achievements_user_idx on public.user_achievements (user_id, earned_at desc);

do $$
begin
  if to_regclass('public.focus_sessions') is not null
     and not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'focus_sessions_user_started_uidx')
     and not exists (
       select 1 from public.focus_sessions group by user_id, started_at having count(*) > 1
     )
  then
    create unique index focus_sessions_user_started_uidx on public.focus_sessions (user_id, started_at);
  end if;
end $$;

create or replace function public.create_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Student'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile();

create or replace function public.reset_tester_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tester_email constant text := 'tester@getstudyflow.in';
  user_email text;
  keep_subscription boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select lower(email) into user_email from auth.users where id = uid;
  if user_email is distinct from tester_email then
    raise exception 'Tester sample data is only available for the Study Flow tester account';
  end if;

  insert into public.profiles (id, display_name)
  values (uid, 'Study Flow Tester')
  on conflict (id) do update
    set display_name = excluded.display_name;

  delete from public.study_tasks where user_id = uid;
  delete from public.study_goals where user_id = uid;
  delete from public.focus_sessions where user_id = uid;
  delete from public.ai_generations where user_id = uid;
  delete from public.user_achievements where user_id = uid;
  delete from public.user_settings where user_id = uid;

  select exists (
    select 1
      from public.subscriptions s
     where s.user_id = uid
       and coalesce(s.provider, '') is distinct from 'tester'
       and s.state in ('active', 'ending', 'cancelled', 'pending')
  ) into keep_subscription;

  if not keep_subscription then
    insert into public.subscriptions (
      user_id, provider, entitlement_id, entitlement_ids, product_id, state, expires_at, will_renew, updated_at
    ) values (
      uid, 'tester', 'trial', '{}'::text[], 'tester_demo_trial', 'active', now() + interval '15 days', false, now()
    )
    on conflict (user_id) do update
      set provider = excluded.provider,
          entitlement_id = excluded.entitlement_id,
          entitlement_ids = excluded.entitlement_ids,
          product_id = excluded.product_id,
          state = excluded.state,
          expires_at = excluded.expires_at,
          will_renew = excluded.will_renew,
          updated_at = excluded.updated_at;
  end if;

  return jsonb_build_object(
    'ok', true,
    'cleared', true,
    'subscription_seeded', not keep_subscription
  );
end;
$$;

revoke all on function public.reset_tester_data() from public, anon;
grant execute on function public.reset_tester_data() to authenticated;

comment on function public.reset_tester_data() is
  'Clears owned study rows for tester@getstudyflow.in so the app can reseed sample data. Other accounts cannot call this successfully.';
