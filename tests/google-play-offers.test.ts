import { describe, expect, it } from 'vitest';

import {
  displayPriceForBasePlan,
  hasBasePlanOffers,
  offerTokenForBasePlan,
} from '@/lib/google-play-offers';
import type { PlaySubscriptionLike } from '@/lib/google-play-offers';

const proProduct = (): PlaySubscriptionLike => ({
  id: 'study_flow_pro',
  displayPrice: '₹299.00',
  subscriptionOfferDetailsAndroid: [
    {
      basePlanId: 'monthly',
      offerId: null,
      offerToken: 'token-pro-monthly',
      pricingPhases: {
        pricingPhaseList: [{ priceAmountMicros: '299000000', billingPeriod: 'P1M', formattedPrice: '₹299.00' }],
      },
    },
    {
      basePlanId: 'yearly',
      offerId: null,
      offerToken: 'token-pro-yearly',
      pricingPhases: {
        pricingPhaseList: [{ priceAmountMicros: '2500000000', billingPeriod: 'P1Y', formattedPrice: '₹2,500.00' }],
      },
    },
  ],
  subscriptionOffers: [
    {
      basePlanIdAndroid: 'monthly',
      id: '',
      offerTokenAndroid: 'token-pro-monthly',
      displayPrice: '₹299.00',
      paymentMode: 'unknown',
    },
    {
      basePlanIdAndroid: 'yearly',
      id: '',
      offerTokenAndroid: 'token-pro-yearly',
      displayPrice: '₹2,500.00',
      paymentMode: 'unknown',
    },
  ],
});

const proWithEligibleTrial = (): PlaySubscriptionLike => ({
  id: 'study_flow_pro',
  displayPrice: '₹299.00',
  subscriptionOfferDetailsAndroid: [
    {
      basePlanId: 'monthly',
      offerId: null,
      offerToken: 'token-pro-monthly',
      pricingPhases: {
        pricingPhaseList: [{ priceAmountMicros: '299000000', billingPeriod: 'P1M', formattedPrice: '₹299.00' }],
      },
    },
    {
      basePlanId: 'yearly',
      offerId: 'freetrial',
      offerToken: 'token-pro-yearly-trial',
      pricingPhases: {
        pricingPhaseList: [
          { priceAmountMicros: '0', billingPeriod: 'P15D', billingCycleCount: 1, formattedPrice: 'Free' },
          { priceAmountMicros: '2500000000', billingPeriod: 'P1Y', formattedPrice: '₹2,500.00' },
        ],
      },
    },
    {
      basePlanId: 'yearly',
      offerId: null,
      offerToken: 'token-pro-yearly',
      pricingPhases: {
        pricingPhaseList: [{ priceAmountMicros: '2500000000', billingPeriod: 'P1Y', formattedPrice: '₹2,500.00' }],
      },
    },
  ],
  subscriptionOffers: [
    {
      basePlanIdAndroid: 'yearly',
      id: 'freetrial',
      offerTokenAndroid: 'token-pro-yearly-trial',
      displayPrice: 'Free',
      paymentMode: 'free-trial',
      period: { unit: 'day', value: 15 },
      periodCount: 1,
      price: 0,
      pricingPhasesAndroid: {
        pricingPhaseList: [
          { priceAmountMicros: '0', billingPeriod: 'P15D', billingCycleCount: 1, formattedPrice: 'Free' },
          { priceAmountMicros: '2500000000', billingPeriod: 'P1Y', formattedPrice: '₹2,500.00' },
        ],
      },
    },
  ],
});

describe('Google Play offer-token selection', () => {
  it('selects the monthly and yearly offer tokens from the existing base plans', () => {
    const product = proProduct();
    const yearlyFirst: PlaySubscriptionLike = {
      ...product,
      subscriptionOfferDetailsAndroid: [
        product.subscriptionOfferDetailsAndroid![1],
        product.subscriptionOfferDetailsAndroid![0],
      ],
    };
    expect(offerTokenForBasePlan(product, 'monthly')).toBe('token-pro-monthly');
    expect(offerTokenForBasePlan(product, 'yearly')).toBe('token-pro-yearly');
    expect(offerTokenForBasePlan(yearlyFirst, 'monthly')).toBe('token-pro-monthly');
    expect(offerTokenForBasePlan(yearlyFirst, 'yearly')).toBe('token-pro-yearly');
    expect(displayPriceForBasePlan(product, 'monthly')).toBe('₹299.00');
    expect(displayPriceForBasePlan(product, 'yearly')).toBe('₹2,500.00');
    expect(hasBasePlanOffers(product, 'monthly')).toBe(true);
    expect(hasBasePlanOffers(product, 'yearly')).toBe(true);
  });

  it('skips a free-trial offer token even when Play returned one', () => {
    const product = proWithEligibleTrial();
    expect(offerTokenForBasePlan(product, 'yearly')).toBe('token-pro-yearly');
    expect(offerTokenForBasePlan(product, 'monthly')).toBe('token-pro-monthly');
  });

  it('still uses a paid offer when the offer id is only named freetrial', () => {
    expect(
      offerTokenForBasePlan(
        {
          id: 'study_flow_pro',
          subscriptionOfferDetailsAndroid: [
            {
              basePlanId: 'yearly',
              offerId: 'freetrial',
              offerToken: 'token-draft-name-only',
              pricingPhases: {
                pricingPhaseList: [{ priceAmountMicros: '2500000000', billingPeriod: 'P1Y', formattedPrice: '₹2,500.00' }],
              },
            },
          ],
        },
        'yearly',
      ),
    ).toBe('token-draft-name-only');
  });

  it('rejects unknown products and unknown base plans', () => {
    expect(offerTokenForBasePlan(proProduct(), 'weekly')).toBeNull();
    expect(offerTokenForBasePlan(proProduct(), null)).toBeNull();
    expect(offerTokenForBasePlan(null, 'monthly')).toBeNull();
    expect(hasBasePlanOffers(proProduct(), 'lifetime')).toBe(false);
    expect(offerTokenForBasePlan({ id: 'unknown', subscriptionOfferDetailsAndroid: [] }, 'monthly')).toBeNull();
  });
});
