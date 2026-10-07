import { PLAN_CONFIG } from '@/lib/plans';

export const defaultPricing = {
  basicMonthly: PLAN_CONFIG.basic.monthlyPrice,
  basicYearly: PLAN_CONFIG.basic.yearlyPrice,
  proMonthly: PLAN_CONFIG.pro.monthlyPrice,
  proYearly: PLAN_CONFIG.pro.yearlyPrice,
  currency: 'INR',
} as const;

export const money = (amount: number, currency = defaultPricing.currency) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

export const proAnnualSaving = defaultPricing.proMonthly * 12 - defaultPricing.proYearly;
export const proAnnualDiscount = Math.round((proAnnualSaving / (defaultPricing.proMonthly * 12)) * 1000) / 10;
