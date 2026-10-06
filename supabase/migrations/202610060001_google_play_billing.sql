-- Store Google Play purchase tokens so Real-time developer notifications can
-- map a Play subscription back to a Study Flow user. Additive only.

alter table public.subscriptions
  add column if not exists purchase_token text;

alter table public.subscriptions
  alter column provider set default 'google_play';

create unique index if not exists subscriptions_purchase_token_uidx
  on public.subscriptions (purchase_token)
  where purchase_token is not null and length(purchase_token) > 0;
