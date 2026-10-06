import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { PRODUCT_IDS } from '@/lib/google-play-products';
import {
  localFreeEntitlementNote,
  playBillingIntroCopy,
  playTrialIntroCopy,
  preferredPlayTrialProduct,
  trialFromPlayProduct,
  trialFromPricingPhases,
  trialLabelFromIsoPeriod,
} from '@/lib/google-play-trial';

describe('Google Play trial offer display', () => {
  it('does not invent a 15-day trial when Play returned no phases', () => {
    expect(trialFromPricingPhases([])).toBeNull();
    expect(trialFromPricingPhases(undefined)).toBeNull();
    expect(trialFromPlayProduct({})).toBeNull();
    expect(trialFromPlayProduct({ subscriptionOffers: [], subscriptionOfferDetailsAndroid: [] })).toBeNull();
    expect(playTrialIntroCopy(null)).toBeNull();
  });

  it('does not treat a paid phase as a trial', () => {
    expect(
      trialFromPricingPhases([
        {
          priceAmountMicros: '299000000',
          billingPeriod: 'P1M',
          billingCycleCount: 0,
        },
      ]),
    ).toBeNull();
  });

  it('labels a Play free-trial phase from the actual billing period', () => {
    expect(trialLabelFromIsoPeriod('P15D')).toBe('15-day free trial');
    expect(
      trialFromPricingPhases([
        { priceAmountMicros: '0', billingPeriod: 'P15D', billingCycleCount: 1 },
        { priceAmountMicros: '2500000000', billingPeriod: 'P1Y', billingCycleCount: 0 },
      ]),
    ).toEqual({ trialLabel: '15-day free trial', billingPeriod: 'P15D' });
  });

  it('reads an eligible free-trial offer from Play product payloads', () => {
    expect(
      trialFromPlayProduct({
        subscriptionOffers: [
          {
            paymentMode: 'free-trial',
            period: { unit: 'day', value: 15 },
            periodCount: 1,
            price: 0,
          },
        ],
      }),
    ).toEqual({ trialLabel: '15-day free trial', billingPeriod: null });

    expect(
      trialFromPlayProduct({
        subscriptionOfferDetailsAndroid: [
          {
            pricingPhases: {
              pricingPhaseList: [{ priceAmountMicros: 0, billingPeriod: 'P15D', billingCycleCount: 1 }],
            },
          },
        ],
      }),
    ).toEqual({ trialLabel: '15-day free trial', billingPeriod: 'P15D' });
  });

  it('prefers a Pro yearly trial product when more than one offer exists', () => {
    const preferred = preferredPlayTrialProduct([
      { productId: PRODUCT_IDS.basicMonthly, trialLabel: '7-day free trial' },
      { productId: PRODUCT_IDS.proYearly, trialLabel: '15-day free trial' },
    ]);
    expect(preferred?.productId).toBe(PRODUCT_IDS.proYearly);
    expect(preferredPlayTrialProduct([{ productId: PRODUCT_IDS.basicMonthly, trialLabel: null }])).toBeNull();
  });

  it('treats Free as local entitlement, not Play trial unavailability', () => {
    expect(localFreeEntitlementNote('free')).toMatch(/does not mean a Google Play trial is unavailable/i);
    expect(localFreeEntitlementNote('pro')).toBeNull();
    expect(localFreeEntitlementNote('trial')).toBeNull();
  });

  it('does not hard-code a 15-day trial on the subscription page', () => {
    expect(playBillingIntroCopy()).not.toMatch(/15-day/i);
    expect(playTrialIntroCopy('15-day free trial')).toMatch(/15-day free trial/i);
    const source = readFileSync(path.join(__dirname, '../app/subscription.tsx'), 'utf8');
    expect(source).not.toMatch(/15-day free trial/i);
    expect(source).not.toMatch(/public SDK keys/i);
  });
});
