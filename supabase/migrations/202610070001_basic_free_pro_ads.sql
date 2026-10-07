-- Map leftover trial entitlements to the permanent free Basic plan.
-- Active Pro rows are left unchanged.

update public.subscriptions
set
  entitlement_id = 'basic',
  entitlement_ids = array['basic']::text[],
  product_id = case
    when product_id = 'tester_demo_trial' then 'tester_demo_pro'
    else product_id
  end,
  updated_at = now()
where
  (
    lower(coalesce(entitlement_id, '')) like '%trial%'
    or exists (
      select 1
      from unnest(coalesce(entitlement_ids, '{}'::text[])) as entitlement
      where lower(entitlement) like '%trial%'
    )
    or product_id = 'tester_demo_trial'
  )
  and not (
    lower(coalesce(entitlement_id, '')) like '%pro%'
    or exists (
      select 1
      from unnest(coalesce(entitlement_ids, '{}'::text[])) as entitlement
      where lower(entitlement) like '%pro%'
    )
  );

alter table public.pricing_config drop constraint if exists pricing_config_trial_days_check;
alter table public.pricing_config drop constraint if exists pricing_config_trial_price_check;

update public.pricing_config
set
  trial_price = 0,
  trial_days = 0,
  monthly_price = 0,
  yearly_price = 0,
  pro_monthly_price = 299,
  pro_yearly_price = 2500,
  updated_at = now()
where region = 'IN';

alter table public.pricing_config add constraint pricing_config_trial_price_check check (trial_price = 0);
alter table public.pricing_config add constraint pricing_config_trial_days_check check (trial_days = 0);
