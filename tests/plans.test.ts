import { describe, expect, it } from 'vitest';

import { defaultPricing } from '@/services/pricing';
import { PLAN_CONFIG, getDailyAiLimit, getPlanConfig } from '@/lib/plans';

describe('plan configuration', () => {
  it('keeps Basic free with 20 daily AI generations and ads', () => {
    expect(PLAN_CONFIG.basic.price).toBe(0);
    expect(PLAN_CONFIG.basic.monthlyPrice).toBe(0);
    expect(PLAN_CONFIG.basic.yearlyPrice).toBe(0);
    expect(getDailyAiLimit('basic')).toBe(20);
    expect(getPlanConfig('basic').adsEnabled).toBe(true);
    expect(defaultPricing.basicMonthly).toBe(0);
  });

  it('keeps Pro as the only paid plan at ₹299 / ₹2,500 with 80 daily AI generations', () => {
    expect(PLAN_CONFIG.pro.monthlyPrice).toBe(299);
    expect(PLAN_CONFIG.pro.yearlyPrice).toBe(2500);
    expect(getDailyAiLimit('pro')).toBe(80);
    expect(getPlanConfig('pro').adsEnabled).toBe(false);
    expect(defaultPricing.proMonthly).toBe(299);
    expect(defaultPricing.proYearly).toBe(2500);
  });
});
