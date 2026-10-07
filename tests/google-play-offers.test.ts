import { describe, expect, it } from 'vitest';

import {
  displayPriceForBasePlan,
  hasBasePlanOffers,
  offerTokenForBasePlan,
} from '@/lib/google-play-offers';
import type { PlaySubscriptionLike } from '@/lib/google-play-offers';

const basicProduct = (): PlaySubscriptionLike => ({
  id: 'study_flow_basic',
  displayPrice: '₹99.00',
  subscriptionOfferDetailsAndroid: [
    {
      basePlanId: 'monthly',
      offerId: null,
      offerToken: 'token-basic-monthly',
      pricingPhases: {
        pricingPhaseList: [{ priceAmountMicros: '99000000', billingPeriod: 'P1M', formattedPrice: '₹99.00' }],
      },
    },
    {
      basePlanId: 'yearly',
      offerId: null,
      offerToken: 'token-basic-yearly',
      pricingPhases: {
        pricingPhaseList: [{ priceAmountMicros: '1000000000', billingPeriod: 'P1Y', formattedPrice: '₹1,000.00' }],
      },
    },
  ],
  subscriptionOffers: [
    {
      basePlanIdAndroid: 'monthly',
      id: '',
      offerTokenAndroid: 'token-basic-monthly',
      displayPrice: '₹99.00',
      paymentMode: 'unknown',
    },
    {
      basePlanIdAndroid: 'yearly',
      id: '',
      offerTokenAndroid: 'token-basic-yearly',
      displayPrice: '₹1,000.00',
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
    const product = basicProduct();
    const yearlyFirst: PlaySubscriptionLike = {
      ...product,
      subscriptionOfferDetailsAndroid: [
        product.subscriptionOfferDetailsAndroid![1],
        product.subscriptionOfferDetailsAndroid![0],
      ],
    };
    expect(offerTokenForBasePlan(product, 'monthly')).toBe('token-basic-monthly');
    expect(offerTokenForBasePlan(product, 'yearly')).toBe('token-basic-yearly');
    expect(offerTokenForBasePlan(yearlyFirst, 'monthly')).toBe('token-basic-monthly');
    expect(offerTokenForBasePlan(yearlyFirst, 'yearly')).toBe('token-basic-yearly');
    expect(displayPriceForBasePlan(product, 'monthly')).toBe('₹99.00');
    expect(displayPriceForBasePlan(product, 'yearly')).toBe('₹1,000.00');
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
    expect(offerTokenForBasePlan(basicProduct(), 'weekly')).toBeNull();
    expect(offerTokenForBasePlan(basicProduct(), null)).toBeNull();
    expect(offerTokenForBasePlan(null, 'monthly')).toBeNull();
    expect(hasBasePlanOffers(basicProduct(), 'lifetime')).toBe(false);
    expect(offerTokenForBasePlan({ id: 'unknown', subscriptionOfferDetailsAndroid: [] }, 'monthly')).toBeNull();
  });
});
