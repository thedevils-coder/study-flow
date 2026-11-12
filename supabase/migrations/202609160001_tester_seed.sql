-- Dedicated tester account helpers. This does not create auth users, disable RLS,
-- or grant admin. Only the signed-in tester@getstudyflow.in user can execute it.

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

  delete from public.study_tasks where user_id = uid;
  delete from public.study_goals where user_id = uid;
  delete from public.focus_sessions where user_id = uid;
  delete from public.ai_generations where user_id = uid;
  delete from public.user_achievements where user_id = uid;
  delete from public.user_settings where user_id = uid;

  update public.profiles
     set display_name = 'Study Flow Tester'
   where id = uid;

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
