export const PLAY_BILLING_PROVIDER = 'google_play';

export const PLAY_PRODUCT_CATALOG = {
  studyflow_basic_monthly: { entitlement: 'basic', plan: 'basic' },
  studyflow_basic_yearly: { entitlement: 'basic', plan: 'basic' },
  studyflow_pro_monthly: { entitlement: 'pro', plan: 'pro' },
  studyflow_pro_yearly: { entitlement: 'pro', plan: 'pro' },
} as const;

export type PlayProductId = keyof typeof PLAY_PRODUCT_CATALOG;

export function isPlayProductId(value: string | null | undefined): value is PlayProductId {
  return Boolean(value && value in PLAY_PRODUCT_CATALOG);
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
