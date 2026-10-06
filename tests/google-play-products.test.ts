import { describe, expect, it } from 'vitest';

import {
  PRODUCT_IDS,
  entitlementFromProductId,
  isPlayProductId,
  planFromProductId,
  PLAY_PRODUCT_ID_LIST,
} from '@/lib/google-play-products';
import { planForVerifiedProduct, subscriptionStatusFromPlayState } from '@/lib/google-play-subscription';

describe('Google Play product catalog', () => {
  it('keeps Basic and Pro monthly/yearly IDs in one mapping', () => {
    expect(PLAY_PRODUCT_ID_LIST).toEqual([
      PRODUCT_IDS.basicMonthly,
      PRODUCT_IDS.basicYearly,
      PRODUCT_IDS.proMonthly,
      PRODUCT_IDS.proYearly,
    ]);
    expect(entitlementFromProductId(PRODUCT_IDS.basicMonthly)).toBe('basic');
    expect(entitlementFromProductId(PRODUCT_IDS.basicYearly)).toBe('basic');
    expect(entitlementFromProductId(PRODUCT_IDS.proMonthly)).toBe('pro');
    expect(entitlementFromProductId(PRODUCT_IDS.proYearly)).toBe('pro');
    expect(planFromProductId(PRODUCT_IDS.proYearly)).toBe('pro');
    expect(isPlayProductId('unknown_sku')).toBe(false);
  });

  it('does not treat pending or expired Play states as paid plans', () => {
    expect(subscriptionStatusFromPlayState('SUBSCRIPTION_STATE_ACTIVE')).toBe('active');
    expect(subscriptionStatusFromPlayState('SUBSCRIPTION_STATE_CANCELED')).toBe('cancelled');
    expect(subscriptionStatusFromPlayState('SUBSCRIPTION_STATE_PENDING')).toBe('pending');
    expect(subscriptionStatusFromPlayState('SUBSCRIPTION_STATE_EXPIRED')).toBe('expired');
    expect(planForVerifiedProduct(PRODUCT_IDS.proMonthly, 'pending')).toBe('none');
    expect(planForVerifiedProduct(PRODUCT_IDS.proMonthly, 'active')).toBe('pro');
    expect(planForVerifiedProduct(PRODUCT_IDS.basicYearly, 'cancelled')).toBe('basic');
  });
});
