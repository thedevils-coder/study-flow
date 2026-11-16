-- Additive in-flight AI quota reservations. Existing ai_generations rows are not rewritten.

create schema if not exists private;

grant usage on schema private to postgres;

create table if not exists private.ai_generation_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_start timestamptz not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint ai_generation_reservations_window check (expires_at > created_at)
);

create index if not exists ai_generation_reservations_user_day_idx
  on private.ai_generation_reservations (user_id, day_start, expires_at);

alter table private.ai_generation_reservations enable row level security;

create or replace function public.reserve_ai_generation_slot(p_user_id uuid, p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_limit integer;
  v_day_start timestamptz;
  v_success integer;
  v_reserved integer;
  v_used integer;
  v_id uuid;
begin
  if p_user_id is null then
    raise exception 'user required';
  end if;

  v_limit := case when p_plan = 'pro' then 80 else 20 end;
  v_day_start := date_trunc('day', timezone('utc', now())) at time zone 'utc';

  perform pg_advisory_xact_lock(87112003, hashtext(p_user_id::text));

  delete from private.ai_generation_reservations
   where user_id = p_user_id
     and expires_at <= now();

  select count(*)::integer
    into v_success
    from public.ai_generations
   where user_id = p_user_id
     and created_at >= v_day_start
     and status = 'success';

  select count(*)::integer
    into v_reserved
    from private.ai_generation_reservations
   where user_id = p_user_id
     and day_start = v_day_start
     and expires_at > now();

  v_used := coalesce(v_success, 0) + coalesce(v_reserved, 0);
  if v_used >= v_limit then
    return jsonb_build_object(
      'allowed', false,
      'id', null,
      'used', v_used,
      'remaining', 0,
      'limit', v_limit
    );
  end if;

  insert into private.ai_generation_reservations (user_id, day_start, expires_at)
  values (p_user_id, v_day_start, now() + interval '10 minutes')
  returning id into v_id;

  return jsonb_build_object(
    'allowed', true,
    'id', v_id,
    'used', v_used + 1,
    'remaining', v_limit - v_used - 1,
    'limit', v_limit
  );
end;
$$;

create or replace function public.release_ai_generation_slot(p_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_count integer;
begin
  delete from private.ai_generation_reservations
   where id = p_id
     and user_id = p_user_id;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

do $privileges$
declare
  role_name text;
begin
  revoke all on schema private from public;
  revoke all on table private.ai_generation_reservations from public;
  revoke all on function public.reserve_ai_generation_slot(uuid, text) from public;
  revoke all on function public.release_ai_generation_slot(uuid, uuid) from public;

  foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on schema private from %I', role_name);
      execute format('revoke all on table private.ai_generation_reservations from %I', role_name);
      execute format('revoke all on function public.reserve_ai_generation_slot(uuid, text) from %I', role_name);
      execute format('revoke all on function public.release_ai_generation_slot(uuid, uuid) from %I', role_name);
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema private to service_role;
    grant all on table private.ai_generation_reservations to service_role;
    grant execute on function public.reserve_ai_generation_slot(uuid, text) to service_role;
    grant execute on function public.release_ai_generation_slot(uuid, uuid) to service_role;
  end if;
end
$privileges$;
