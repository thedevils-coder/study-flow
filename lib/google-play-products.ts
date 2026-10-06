import type { Plan, ProductId } from '@/types';

/**
 * Google Play Console application ID. Must match app.json android.package.
 */
export const ANDROID_PACKAGE_NAME = 'com.prabhjotkaur.studyflow';

export const PLAY_BILLING_PROVIDER = 'google_play';

/**
 * Subscription product IDs. These must match Google Play Console product IDs
 * exactly. If Console uses different IDs, change this mapping only — do not
 * scatter replacements through the app.
 *
 * Expected Play Console products (base plans / offers are configured there):
 * - studyflow_basic_monthly  (display default ₹99 / month)
 * - studyflow_basic_yearly   (display default ₹1,000 / year)
 * - studyflow_pro_monthly    (display default ₹299 / month)
 * - studyflow_pro_yearly     (display default ₹2,500 / year)
 */
export const PRODUCT_IDS = {
  basicMonthly: 'studyflow_basic_monthly',
  basicYearly: 'studyflow_basic_yearly',
  proMonthly: 'studyflow_pro_monthly',
  proYearly: 'studyflow_pro_yearly',
} as const satisfies Record<string, ProductId>;

export type PlayProductPeriod = 'monthly' | 'yearly';
export type PlayEntitlement = 'basic' | 'pro';

export type PlayProductCatalogEntry = {
  productId: ProductId;
  entitlement: PlayEntitlement;
  plan: Extract<Plan, 'basic' | 'pro'>;
  period: PlayProductPeriod;
  label: string;
};

export const PLAY_PRODUCT_CATALOG: Record<ProductId, PlayProductCatalogEntry> = {
  studyflow_basic_monthly: {
    productId: 'studyflow_basic_monthly',
    entitlement: 'basic',
    plan: 'basic',
    period: 'monthly',
    label: 'Basic monthly',
  },
  studyflow_basic_yearly: {
    productId: 'studyflow_basic_yearly',
    entitlement: 'basic',
    plan: 'basic',
    period: 'yearly',
    label: 'Basic yearly',
  },
  studyflow_pro_monthly: {
    productId: 'studyflow_pro_monthly',
    entitlement: 'pro',
    plan: 'pro',
    period: 'monthly',
    label: 'Pro monthly',
  },
  studyflow_pro_yearly: {
    productId: 'studyflow_pro_yearly',
    entitlement: 'pro',
    plan: 'pro',
    period: 'yearly',
    label: 'Pro yearly',
  },
};

export const PLAY_PRODUCT_ID_LIST = Object.values(PRODUCT_IDS);

export function isPlayProductId(value: string | null | undefined): value is ProductId {
  return Boolean(value && value in PLAY_PRODUCT_CATALOG);
}

export function playProductEntry(productId: string | null | undefined): PlayProductCatalogEntry | null {
  if (!isPlayProductId(productId)) return null;
  return PLAY_PRODUCT_CATALOG[productId];
}

export function entitlementFromProductId(productId: string | null | undefined): PlayEntitlement | null {
  return playProductEntry(productId)?.entitlement ?? null;
}

export function planFromProductId(productId: string | null | undefined): Extract<Plan, 'basic' | 'pro'> | null {
  return playProductEntry(productId)?.plan ?? null;
}
