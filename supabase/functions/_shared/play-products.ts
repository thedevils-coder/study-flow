export const PLAY_BILLING_PROVIDER = 'google_play';

export const PLAY_SUBSCRIPTION_SKUS = {
  study_flow_basic: { entitlement: 'basic', plan: 'basic' },
  study_flow_pro: { entitlement: 'pro', plan: 'pro' },
} as const;

const LEGACY_PLAY_PRODUCT_IDS = {
  studyflow_basic_monthly: { entitlement: 'basic', plan: 'basic' },
  studyflow_basic_yearly: { entitlement: 'basic', plan: 'basic' },
  studyflow_pro_monthly: { entitlement: 'pro', plan: 'pro' },
  studyflow_pro_yearly: { entitlement: 'pro', plan: 'pro' },
} as const;

export const PLAY_BASE_PLAN_IDS = ['monthly', 'yearly'] as const;

export type PlayProductId = keyof typeof PLAY_SUBSCRIPTION_SKUS;
export type PlayBasePlanId = (typeof PLAY_BASE_PLAN_IDS)[number];
export type PlayEntitlement = 'basic' | 'pro';

export function isPlaySubscriptionSku(value: string | null | undefined): value is PlayProductId {
  return Boolean(value && value in PLAY_SUBSCRIPTION_SKUS);
}

export function isPlayBasePlanId(value: string | null | undefined): value is PlayBasePlanId {
  return value === 'monthly' || value === 'yearly';
}

export function isLegacyPlayProductId(value: string | null | undefined): value is keyof typeof LEGACY_PLAY_PRODUCT_IDS {
  return Boolean(value && value in LEGACY_PLAY_PRODUCT_IDS);
}

/** Current Play Console subscription SKUs only. Not historical four-SKU IDs. */
export function isPlayProductId(value: string | null | undefined): boolean {
  return isPlaySubscriptionSku(value);
}

/**
 * Play purchase-token verification. Maps current Console SKUs with base plans
 * monthly or yearly. `study_flow_pro` is the paid product. `study_flow_basic`
 * is mapped to free Basic so existing tokens/rows can still restore/sync.
 * Unknown SKUs, unknown base plans, and historical four-SKU IDs fail closed
 * for new Play verification.
 */
export function catalogForVerifiedProduct(
  productId: string | null | undefined,
  basePlanId?: string | null,
): { entitlement: PlayEntitlement; plan: PlayEntitlement } | null {
  if (!isPlaySubscriptionSku(productId) || !isPlayBasePlanId(basePlanId)) return null;
  return PLAY_SUBSCRIPTION_SKUS[productId];
}

/** Stored subscriptions rows only. Do not use for Play purchase verification. */
export function catalogForStoredProductId(productId: string | null | undefined) {
  if (isPlaySubscriptionSku(productId)) return PLAY_SUBSCRIPTION_SKUS[productId];
  if (isLegacyPlayProductId(productId)) return LEGACY_PLAY_PRODUCT_IDS[productId];
  return null;
}

export type MappedSubscriptionState =
  | 'none'
  | 'active'
  | 'ending'
  | 'pending'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export function subscriptionStatusFromPlayState(state: string | null | undefined): MappedSubscriptionState {
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
