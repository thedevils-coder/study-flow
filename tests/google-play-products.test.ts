import { describe, expect, it } from 'vitest';

import {
  PLAY_BASE_PLAN_IDS,
  PLAY_PRODUCT_CATALOG,
  PLAY_PRODUCT_ID_LIST,
  PLAY_PRODUCT_QUERY_SKUS,
  PLAY_SUBSCRIPTION_SKUS,
  PRODUCT_IDS,
  entitlementFromProductId,
  isPlayBasePlanId,
  isPlayProductId,
  isPlaySubscriptionSku,
  playCatalogFromPlay,
  playProductEntry,
  planFromProductId,
} from '@/lib/google-play-products';
import { planForVerifiedProduct, subscriptionStatusFromPlayState } from '@/lib/google-play-subscription';
import { catalogForStoredProductId, catalogForVerifiedProduct } from '../supabase/functions/_shared/play-products';

describe('Google Play product catalog', () => {
  it('queries the existing Play Console subscription SKUs', () => {
    expect(PLAY_PRODUCT_QUERY_SKUS).toEqual([PLAY_SUBSCRIPTION_SKUS.basic, PLAY_SUBSCRIPTION_SKUS.pro]);
    expect(PLAY_SUBSCRIPTION_SKUS.basic).toBe('study_flow_basic');
    expect(PLAY_SUBSCRIPTION_SKUS.pro).toBe('study_flow_pro');
    expect(PLAY_BASE_PLAN_IDS.monthly).toBe('monthly');
    expect(PLAY_BASE_PLAN_IDS.yearly).toBe('yearly');
  });

  it('maps Basic monthly and yearly to the Basic entitlement', () => {
    expect(playProductEntry(PRODUCT_IDS.basicMonthly)).toMatchObject({
      playProductId: 'study_flow_basic',
      basePlanId: 'monthly',
      entitlement: 'basic',
      plan: 'basic',
    });
    expect(playProductEntry(PRODUCT_IDS.basicYearly)).toMatchObject({
      playProductId: 'study_flow_basic',
      basePlanId: 'yearly',
      entitlement: 'basic',
    });
    expect(playCatalogFromPlay('study_flow_basic', 'monthly')?.productId).toBe(PRODUCT_IDS.basicMonthly);
    expect(playCatalogFromPlay('study_flow_basic', 'yearly')?.productId).toBe(PRODUCT_IDS.basicYearly);
    expect(entitlementFromProductId(PRODUCT_IDS.basicMonthly)).toBe('basic');
    expect(entitlementFromProductId('study_flow_basic')).toBe('basic');
    expect(planFromProductId('study_flow_basic')).toBe('basic');
    expect(planFromProductId('studyflow_basic_monthly')).toBe('basic');
    expect(planFromProductId('studyflow_basic_yearly')).toBe('basic');
  });

  it('maps Pro monthly and yearly to the Pro entitlement', () => {
    expect(playProductEntry(PRODUCT_IDS.proMonthly)).toMatchObject({
      playProductId: 'study_flow_pro',
      basePlanId: 'monthly',
      entitlement: 'pro',
    });
    expect(playProductEntry(PRODUCT_IDS.proYearly)).toMatchObject({
      playProductId: 'study_flow_pro',
      basePlanId: 'yearly',
      entitlement: 'pro',
    });
    expect(playCatalogFromPlay('study_flow_pro', 'monthly')?.plan).toBe('pro');
    expect(playCatalogFromPlay('study_flow_pro', 'yearly')?.plan).toBe('pro');
    expect(entitlementFromProductId(PRODUCT_IDS.proYearly)).toBe('pro');
    expect(entitlementFromProductId('study_flow_pro')).toBe('pro');
    expect(planFromProductId('study_flow_pro')).toBe('pro');
    expect(planFromProductId('studyflow_pro_monthly')).toBe('pro');
    expect(planFromProductId('studyflow_pro_yearly')).toBe('pro');
  });

  it('keeps UI catalog keys separate from Play query SKUs', () => {
    expect(PLAY_PRODUCT_ID_LIST).toEqual([
      PRODUCT_IDS.basicMonthly,
      PRODUCT_IDS.basicYearly,
      PRODUCT_IDS.proMonthly,
      PRODUCT_IDS.proYearly,
    ]);
    expect(PLAY_PRODUCT_CATALOG[PRODUCT_IDS.basicMonthly].label).toBe('Basic monthly');
    expect(isPlayProductId('unknown_sku')).toBe(false);
    expect(isPlaySubscriptionSku('study_flow_basic')).toBe(true);
    expect(isPlaySubscriptionSku('studyflow_basic_monthly')).toBe(false);
    expect(isPlayBasePlanId('weekly')).toBe(false);
  });

  it('rejects unknown Play products and unknown base plans', () => {
    expect(playCatalogFromPlay('unknown_sku', 'monthly')).toBeNull();
    expect(playCatalogFromPlay('study_flow_basic', 'weekly')).toBeNull();
    expect(playCatalogFromPlay('study_flow_pro', null)).toBeNull();
    expect(playCatalogFromPlay('study_flow_basic', undefined)).toBeNull();
    expect(catalogForVerifiedProduct('study_flow_basic', 'weekly')).toBeNull();
    expect(catalogForVerifiedProduct('not_a_product', 'monthly')).toBeNull();
    expect(catalogForVerifiedProduct('study_flow_pro', 'monthly')).toEqual({
      entitlement: 'pro',
      plan: 'pro',
    });
    expect(catalogForVerifiedProduct('study_flow_basic', 'yearly')).toEqual({
      entitlement: 'basic',
      plan: 'basic',
    });
    expect(catalogForVerifiedProduct('studyflow_basic_monthly', 'monthly')).toBeNull();
    expect(catalogForVerifiedProduct('studyflow_pro_yearly', 'yearly')).toBeNull();
    expect(catalogForVerifiedProduct('studyflow_pro_yearly')).toBeNull();
  });

  it('does not treat pending or expired Play states as paid plans', () => {
    expect(subscriptionStatusFromPlayState('SUBSCRIPTION_STATE_ACTIVE')).toBe('active');
    expect(subscriptionStatusFromPlayState('SUBSCRIPTION_STATE_CANCELED')).toBe('cancelled');
    expect(subscriptionStatusFromPlayState('SUBSCRIPTION_STATE_PENDING')).toBe('pending');
    expect(subscriptionStatusFromPlayState('SUBSCRIPTION_STATE_EXPIRED')).toBe('expired');
    expect(planForVerifiedProduct('study_flow_pro', 'pending')).toBe('none');
    expect(planForVerifiedProduct('study_flow_pro', 'active')).toBe('pro');
    expect(planForVerifiedProduct('study_flow_basic', 'cancelled')).toBe('basic');
    expect(planForVerifiedProduct(PRODUCT_IDS.proMonthly, 'active')).toBe('pro');
    expect(planForVerifiedProduct(PRODUCT_IDS.basicYearly, 'cancelled')).toBe('basic');
  });

  it('maps verified Play purchases by SKU and base plan', () => {
    expect(catalogForVerifiedProduct('study_flow_basic', 'monthly')?.entitlement).toBe('basic');
    expect(catalogForVerifiedProduct('study_flow_basic', 'yearly')?.entitlement).toBe('basic');
    expect(catalogForVerifiedProduct('study_flow_pro', 'monthly')?.entitlement).toBe('pro');
    expect(catalogForVerifiedProduct('study_flow_pro', 'yearly')?.entitlement).toBe('pro');
    expect(catalogForStoredProductId('studyflow_basic_monthly')).toEqual({ entitlement: 'basic', plan: 'basic' });
    expect(catalogForStoredProductId('studyflow_pro_yearly')).toEqual({ entitlement: 'pro', plan: 'pro' });
    expect(entitlementFromProductId('studyflow_pro_yearly')).toBe('pro');
  });
});
