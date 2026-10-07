import { describe, expect, it, beforeEach } from 'vitest';

import {
  INTERSTITIAL_COOLDOWN_MS,
  beginInterstitialAttempt,
  canShowInterstitial,
  finishInterstitialAttempt,
  resetAdPolicyForTests,
} from '@/lib/ad-policy';
import { PLAN_CONFIG } from '@/lib/plans';

describe('interstitial cooldown', () => {
  beforeEach(() => {
    resetAdPolicyForTests();
  });

  it('never shows ads when ads are disabled', () => {
    expect(
      canShowInterstitial({ adsEnabled: false, reason: 'goal_save', token: 'goal-1' }),
    ).toBe(false);
    expect(PLAN_CONFIG.pro.adsEnabled).toBe(false);
    expect(PLAN_CONFIG.basic.adsEnabled).toBe(true);
  });

  it('allows one interstitial then blocks the same save token', () => {
    expect(canShowInterstitial({ adsEnabled: true, reason: 'goal_save', token: 'goal-1' })).toBe(true);
    beginInterstitialAttempt('goal_save', 'goal-1');
    finishInterstitialAttempt(true, 1_000);
    expect(canShowInterstitial({ adsEnabled: true, reason: 'goal_save', token: 'goal-1', now: 1_100 })).toBe(false);
  });

  it('blocks back-to-back interstitials from different actions during the cooldown', () => {
    beginInterstitialAttempt('goal_save', 'goal-1');
    finishInterstitialAttempt(true, 1_000);
    expect(
      canShowInterstitial({ adsEnabled: true, reason: 'task_save', token: 'task-1', now: 1_000 + 10_000 }),
    ).toBe(false);
    expect(
      canShowInterstitial({
        adsEnabled: true,
        reason: 'session_complete',
        token: 'session-1',
        now: 1_000 + INTERSTITIAL_COOLDOWN_MS + 1,
      }),
    ).toBe(true);
  });

  it('does not start a second interstitial while one is in flight', () => {
    expect(canShowInterstitial({ adsEnabled: true, reason: 'goal_save', token: 'a' })).toBe(true);
    beginInterstitialAttempt('goal_save', 'a');
    expect(canShowInterstitial({ adsEnabled: true, reason: 'task_save', token: 'b' })).toBe(false);
    finishInterstitialAttempt(false);
  });
});
