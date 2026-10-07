import type { Plan, SubscriptionStatus } from '@/types';

import {
  entitlementFromProductId,
  isPlayProductId,
  isPlaySubscriptionSku,
  planFromProductId,
} from '@/lib/google-play-products';

/**
 * Google Play Developer API subscriptionsv2 subscriptionState values.
 * Access is granted only for states that still represent a paid period.
 */
export function subscriptionStatusFromPlayState(state: string | null | undefined): SubscriptionStatus {
  switch (String(state || '').toUpperCase()) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return 'active';
    case 'SUBSCRIPTION_STATE_CANCELED':
      return 'cancelled';
    case 'SUBSCRIPTION_STATE_EXPIRED':
    case 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED':
      return 'expired';
    case 'SUBSCRIPTION_STATE_PENDING':
      return 'pending';
    case 'SUBSCRIPTION_STATE_ON_HOLD':
    case 'SUBSCRIPTION_STATE_PAUSED':
      return 'failed';
    default:
      return 'failed';
  }
}

export function willRenewFromPlayLineItem(item: {
  autoRenewingPlan?: { autoRenewEnabled?: boolean | null } | null;
} | null | undefined) {
  return Boolean(item?.autoRenewingPlan?.autoRenewEnabled);
}

export function entitlementIdsForProduct(productId: string | null | undefined): string[] {
  const entitlement = entitlementFromProductId(productId);
  return entitlement ? [entitlement] : [];
}

export function planForVerifiedProduct(
  productId: string | null | undefined,
  status: SubscriptionStatus,
): Plan {
  if (status === 'pending' || status === 'expired' || status === 'refunded' || status === 'failed' || status === 'none') {
    return 'none';
  }
  return planFromProductId(productId) ?? 'none';
}

export function isKnownPlayProduct(productId: string | null | undefined) {
  return isPlaySubscriptionSku(productId) || isPlayProductId(productId);
}
