import { describe, expect, it } from 'vitest';

import {
  canUseKind,
  dailyAiLimit,
  getTier,
  hasBasicAccess,
  hasProAccess,
  normalizePlan,
  shouldShowAds,
} from '@/lib/entitlements';
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

describe('subscription entitlements', () => {
  it('maps legacy monthly and trial rows to basic', () => {
    expect(normalizePlan('monthly')).toBe('basic');
    expect(normalizePlan('trial')).toBe('basic');
    expect(normalizePlan('none')).toBe('basic');
    expect(normalizePlan('premium')).toBe('basic');
  });

  it('treats signed-in users without Pro as Basic', () => {
    expect(getTier(session())).toBe('basic');
    expect(
      getTier(session({ plan: 'basic', subscriptionStatus: 'active', entitlements: ['basic'] })),
    ).toBe('basic');
    expect(getTier(null)).toBe('basic');
  });

  it('treats pro entitlement as pro', () => {
    expect(
      getTier(session({ plan: 'pro', subscriptionStatus: 'active', entitlements: ['pro'] })),
    ).toBe('pro');
  });

  it('does not keep trial as a plan', () => {
    expect(
      getTier(
        session({
          plan: 'trial' as unknown as UserSession['plan'],
          subscriptionStatus: 'active',
          expiresAt: '2099-01-01T00:00:00.000Z',
          entitlements: ['basic'],
        }),
      ),
    ).toBe('basic');
  });

  it('does not grant Pro for pending purchases', () => {
    expect(
      getTier(session({ plan: 'pro', subscriptionStatus: 'pending', entitlements: ['pro'] })),
    ).toBe('basic');
  });

  it('does not grant Pro after expiry', () => {
    expect(
      getTier(
        session({
          plan: 'pro',
          subscriptionStatus: 'active',
          entitlements: ['pro'],
          expiresAt: '2020-01-01T00:00:00.000Z',
        }),
      ),
    ).toBe('basic');
  });

  it('gates AI kinds by plan', () => {
    expect(canUseKind('basic', 'notes')).toBe(true);
    expect(canUseKind('basic', 'leo')).toBe(false);
    expect(canUseKind('pro', 'schedule')).toBe(true);
    expect(hasBasicAccess('basic')).toBe(true);
    expect(hasProAccess('basic')).toBe(false);
    expect(dailyAiLimit('pro')).toBe(80);
    expect(dailyAiLimit('basic')).toBe(20);
  });

  it('shows ads only for authenticated Basic users', () => {
    expect(shouldShowAds(null, 'basic')).toBe(false);
    expect(shouldShowAds(session(), 'basic')).toBe(true);
    expect(shouldShowAds(session({ plan: 'pro', subscriptionStatus: 'active', entitlements: ['pro'] }), 'pro')).toBe(
      false,
    );
  });
});
