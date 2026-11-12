import { describe, expect, it } from 'vitest';

import { GOOGLE_TEST_AD_IDS } from '@/lib/ad-config';
import { shouldShowAds } from '@/lib/plans';
import type { UserSession } from '@/types';

const session = (overrides: Partial<UserSession> = {}): UserSession => ({
  id: 'user',
  email: 'a@b.c',
  name: 'Student',
  role: 'user',
  plan: 'basic',
  subscriptionStatus: 'none',
  entitlements: [],
  ...overrides,
});

describe('ad eligibility', () => {
  it('shows ads only to signed-in Basic users', () => {
    expect(shouldShowAds(null, 'basic')).toBe(false);
    expect(shouldShowAds(session(), 'basic')).toBe(true);
    expect(
      shouldShowAds(session({ plan: 'pro', subscriptionStatus: 'active', entitlements: ['pro'] }), 'pro'),
    ).toBe(false);
  });

  it('keeps official Google test IDs as development defaults', () => {
    expect(GOOGLE_TEST_AD_IDS.androidAppId).toMatch(/^ca-app-pub-3940256099942544~/);
    expect(GOOGLE_TEST_AD_IDS.androidBanner).toMatch(/^ca-app-pub-3940256099942544\//);
  });
});
