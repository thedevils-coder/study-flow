import { describe, expect, it } from 'vitest';

import { defaultPricing } from '@/services/pricing';
import { PLAN_CONFIG, getDailyAiLimit, getPlanConfig, shouldShowAds } from '@/lib/plans';
import { canUseKind, dailyAiLimit, getTier } from '@/lib/entitlements';
import type { UserSession } from '@/types';

const session = (overrides: Partial<UserSession> = {}): UserSession => ({
  id: 'user',
  email: 'a@b.c',
  name: 'Student',
  role: 'user',
  plan: 'none',
  subscriptionStatus: 'none',
  entitlements: [],
  ...overrides,
});

describe('plan configuration', () => {
  it('keeps Basic free with 20 daily AI generations and ads', () => {
    expect(PLAN_CONFIG.basic.price).toBe(0);
    expect(PLAN_CONFIG.basic.monthlyPrice).toBe(0);
    expect(PLAN_CONFIG.basic.yearlyPrice).toBe(0);
    expect(getDailyAiLimit('basic')).toBe(20);
    expect(getPlanConfig('basic').adsEnabled).toBe(true);
    expect(defaultPricing.basicMonthly).toBe(0);
    expect(canUseKind('basic', 'leo')).toBe(true);
    expect(canUseKind('basic', 'notes')).toBe(true);
    expect(canUseKind('basic', 'schedule')).toBe(false);
    expect(canUseKind('basic', 'flashcards')).toBe(false);
    expect(shouldShowAds(session(), 'basic')).toBe(true);
    expect(getTier(session())).toBe('basic');
  });

  it('keeps Pro as the only paid plan at ₹299 / ₹2,500 with 80 daily AI generations and no ads', () => {
    expect(PLAN_CONFIG.pro.monthlyPrice).toBe(299);
    expect(PLAN_CONFIG.pro.yearlyPrice).toBe(2500);
    expect(getDailyAiLimit('pro')).toBe(80);
    expect(getPlanConfig('pro').adsEnabled).toBe(false);
    expect(defaultPricing.proMonthly).toBe(299);
    expect(defaultPricing.proYearly).toBe(2500);
    expect(dailyAiLimit('pro')).toBe(80);
    expect(canUseKind('pro', 'leo')).toBe(true);
    expect(canUseKind('pro', 'schedule')).toBe(true);
    expect(
      shouldShowAds(
        session({ plan: 'pro', subscriptionStatus: 'active', entitlements: ['pro'] }),
        'pro',
      ),
    ).toBe(false);
  });
});
