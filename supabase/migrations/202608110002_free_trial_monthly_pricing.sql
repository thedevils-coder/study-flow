-- Replaces the legacy paid trial pricing and removes the yearly price column.
alter table public.pricing_config drop column if exists yearly_price;
update public.pricing_config set trial_price = 0, trial_days = 15, monthly_price = 99, currency = 'INR';
alter table public.pricing_config drop constraint if exists pricing_config_trial_price_check;
alter table public.pricing_config drop constraint if exists pricing_config_trial_days_check;
alter table public.pricing_config add constraint pricing_config_trial_price_check check (trial_price = 0);
alter table public.pricing_config add constraint pricing_config_trial_days_check check (trial_days = 15);
