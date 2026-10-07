import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { playBillingIntroCopy } from '@/lib/google-play-products';
import { isTrialOffer, isTrialPricingPhases } from '@/lib/google-play-trial';

describe('Google Play trial offers are skipped, not sold', () => {
  it('does not invent a trial when Play returned no phases', () => {
    expect(isTrialPricingPhases([])).toBe(false);
    expect(isTrialPricingPhases(undefined)).toBe(false);
    expect(isTrialOffer({})).toBe(false);
  });

  it('does not treat a paid phase as a trial', () => {
    expect(
      isTrialPricingPhases([
        { priceAmountMicros: '299000000', formattedPrice: '₹299.00' },
      ]),
    ).toBe(false);
  });

  it('detects a free Play phase so the app can skip that offer', () => {
    expect(
      isTrialPricingPhases([
        { priceAmountMicros: '0', formattedPrice: 'Free' },
        { priceAmountMicros: '2500000000', formattedPrice: '₹2,500.00' },
      ]),
    ).toBe(true);
    expect(isTrialOffer({ paymentMode: 'free-trial' })).toBe(true);
  });

  it('does not hard-code a 15-day trial on the subscription page', () => {
    expect(playBillingIntroCopy()).not.toMatch(/15-day/i);
    expect(playBillingIntroCopy()).not.toMatch(/trial/i);
    const source = readFileSync(path.resolve(__dirname, '../app/subscription.tsx'), 'utf8');
    expect(source).not.toMatch(/15-day free trial/i);
    expect(source).not.toMatch(/Start Free Trial/i);
    expect(source).toMatch(/FREE/);
  });
});
