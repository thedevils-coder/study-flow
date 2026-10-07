import type { Plan, ProductId } from '@/types';

/**
 * Google Play Console application ID. Must match app.json android.package.
 */
export const ANDROID_PACKAGE_NAME = 'com.prabhjotkaur.studyflow';

export const PLAY_BILLING_PROVIDER = 'google_play';

/**
 * Play Console subscription product IDs. These must match Console exactly.
 * Monthly/yearly are base plans on these two products, not separate SKUs.
 */
export const PLAY_SUBSCRIPTION_SKUS = {
  basic: 'study_flow_basic',
  pro: 'study_flow_pro',
} as const;

export const PLAY_BASE_PLAN_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
} as const;

export type PlaySubscriptionSku = (typeof PLAY_SUBSCRIPTION_SKUS)[keyof typeof PLAY_SUBSCRIPTION_SKUS];
export type PlayBasePlanId = (typeof PLAY_BASE_PLAN_IDS)[keyof typeof PLAY_BASE_PLAN_IDS];
export type PlayProductPeriod = PlayBasePlanId;
export type PlayEntitlement = 'basic' | 'pro';

/**
 * UI / purchase selection keys. These are not Play Console product IDs.
 * Query Play with PLAY_PRODUCT_QUERY_SKUS and purchase with playProductId + basePlanId.
 */
export const PRODUCT_IDS = {
  basicMonthly: 'basic_monthly',
  basicYearly: 'basic_yearly',
  proMonthly: 'pro_monthly',
  proYearly: 'pro_yearly',
} as const satisfies Record<string, ProductId>;

export type PlayProductCatalogEntry = {
  productId: ProductId;
  playProductId: PlaySubscriptionSku;
  basePlanId: PlayBasePlanId;
  entitlement: PlayEntitlement;
  plan: Extract<Plan, 'basic' | 'pro'>;
  period: PlayProductPeriod;
  label: string;
};

export const PLAY_PRODUCT_CATALOG: Record<ProductId, PlayProductCatalogEntry> = {
  basic_monthly: {
    productId: 'basic_monthly',
    playProductId: 'study_flow_basic',
    basePlanId: 'monthly',
    entitlement: 'basic',
    plan: 'basic',
    period: 'monthly',
    label: 'Basic monthly',
  },
  basic_yearly: {
    productId: 'basic_yearly',
    playProductId: 'study_flow_basic',
    basePlanId: 'yearly',
    entitlement: 'basic',
    plan: 'basic',
    period: 'yearly',
    label: 'Basic yearly',
  },
  pro_monthly: {
    productId: 'pro_monthly',
    playProductId: 'study_flow_pro',
    basePlanId: 'monthly',
    entitlement: 'pro',
    plan: 'pro',
    period: 'monthly',
    label: 'Pro monthly',
  },
  pro_yearly: {
    productId: 'pro_yearly',
    playProductId: 'study_flow_pro',
    basePlanId: 'yearly',
    entitlement: 'pro',
    plan: 'pro',
    period: 'yearly',
    label: 'Pro yearly',
  },
};

/** SKUs passed to expo-iap fetchProducts. */
export const PLAY_PRODUCT_QUERY_SKUS: PlaySubscriptionSku[] = [
  PLAY_SUBSCRIPTION_SKUS.basic,
  PLAY_SUBSCRIPTION_SKUS.pro,
];

export const PLAY_PRODUCT_ID_LIST = Object.values(PRODUCT_IDS);

const LEGACY_PLAY_PRODUCT_IDS: Record<string, { entitlement: PlayEntitlement; plan: Extract<Plan, 'basic' | 'pro'> }> = {
  studyflow_basic_monthly: { entitlement: 'basic', plan: 'basic' },
  studyflow_basic_yearly: { entitlement: 'basic', plan: 'basic' },
  studyflow_pro_monthly: { entitlement: 'pro', plan: 'pro' },
  studyflow_pro_yearly: { entitlement: 'pro', plan: 'pro' },
};

export function isPlaySubscriptionSku(value: string | null | undefined): value is PlaySubscriptionSku {
  return value === PLAY_SUBSCRIPTION_SKUS.basic || value === PLAY_SUBSCRIPTION_SKUS.pro;
}

export function isPlayBasePlanId(value: string | null | undefined): value is PlayBasePlanId {
  return value === PLAY_BASE_PLAN_IDS.monthly || value === PLAY_BASE_PLAN_IDS.yearly;
}

export function isPlayProductId(value: string | null | undefined): value is ProductId {
  return Boolean(value && value in PLAY_PRODUCT_CATALOG);
}

export function playProductEntry(productId: string | null | undefined): PlayProductCatalogEntry | null {
  if (!isPlayProductId(productId)) return null;
  return PLAY_PRODUCT_CATALOG[productId];
}

export function playCatalogFromPlay(
  playProductId: string | null | undefined,
  basePlanId: string | null | undefined,
): PlayProductCatalogEntry | null {
  if (!isPlaySubscriptionSku(playProductId) || !isPlayBasePlanId(basePlanId)) return null;
  return (
    Object.values(PLAY_PRODUCT_CATALOG).find(
      (entry) => entry.playProductId === playProductId && entry.basePlanId === basePlanId,
    ) ?? null
  );
}

function mappingFromStoredProductId(productId: string | null | undefined) {
  const catalog = playProductEntry(productId);
  if (catalog) return { entitlement: catalog.entitlement, plan: catalog.plan };
  if (isPlaySubscriptionSku(productId)) {
    return productId === PLAY_SUBSCRIPTION_SKUS.pro
      ? { entitlement: 'pro' as const, plan: 'pro' as const }
      : { entitlement: 'basic' as const, plan: 'basic' as const };
  }
  if (productId && productId in LEGACY_PLAY_PRODUCT_IDS) return LEGACY_PLAY_PRODUCT_IDS[productId];
  return null;
}

export function entitlementFromProductId(productId: string | null | undefined): PlayEntitlement | null {
  return mappingFromStoredProductId(productId)?.entitlement ?? null;
}

export function planFromProductId(productId: string | null | undefined): Extract<Plan, 'basic' | 'pro'> | null {
  return mappingFromStoredProductId(productId)?.plan ?? null;
}
