export const defaultPricing = {
  trialDays: 15,
  basicMonthly: 99,
  basicYearly: 1000,
  proMonthly: 299,
  proYearly: 2500,
  currency: 'INR',
} as const;

export const money = (amount: number, currency = defaultPricing.currency) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

export const basicAnnualSaving = defaultPricing.basicMonthly * 12 - defaultPricing.basicYearly;
export const proAnnualSaving = defaultPricing.proMonthly * 12 - defaultPricing.proYearly;

export const basicAnnualDiscount = Math.round((basicAnnualSaving / (defaultPricing.basicMonthly * 12)) * 1000) / 10;
export const proAnnualDiscount = Math.round((proAnnualSaving / (defaultPricing.proMonthly * 12)) * 1000) / 10;
