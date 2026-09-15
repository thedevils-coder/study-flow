import { describe, expect, it } from 'vitest';

import {
  canUseKind,
  dailyAiLimit,
  getTier,
  hasBasicAccess,
  hasProAccess,
  normalizePlan,
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
  it('maps legacy monthly to basic', () => {
    expect(normalizePlan('monthly')).toBe('basic');
  });

  it('treats an active basic entitlement as basic', () => {
    expect(
      getTier(session({ plan: 'basic', subscriptionStatus: 'active', entitlements: ['basic'] })),
    ).toBe('basic');
  });

  it('treats pro entitlement as pro', () => {
    expect(
      getTier(session({ plan: 'pro', subscriptionStatus: 'active', entitlements: ['pro'] })),
    ).toBe('pro');
  });

  it('uses provider trial state rather than a local boolean', () => {
    expect(
      getTier(
        session({
          plan: 'trial',
          subscriptionStatus: 'active',
          trialEndsAt: '2099-01-01T00:00:00.000Z',
          entitlements: ['basic'],
        }),
      ),
    ).toBe('trial');
  });

  it('gates AI kinds by plan', () => {
    expect(canUseKind('free', 'notes')).toBe(false);
    expect(canUseKind('basic', 'notes')).toBe(true);
    expect(canUseKind('basic', 'leo')).toBe(false);
    expect(canUseKind('trial', 'leo')).toBe(true);
    expect(canUseKind('pro', 'schedule')).toBe(true);
    expect(hasBasicAccess('basic')).toBe(true);
    expect(hasProAccess('basic')).toBe(false);
    expect(dailyAiLimit('pro')).toBe(80);
    expect(dailyAiLimit('basic')).toBe(10);
    expect(dailyAiLimit('free')).toBe(0);
  });
});
