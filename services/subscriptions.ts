import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { isRevenueCatConfigured, publicConfig } from '@/lib/config';
import {
  ENTITLEMENT_BASIC,
  ENTITLEMENT_LEGACY_PREMIUM,
  ENTITLEMENT_PRO,
  PRODUCT_IDS,
  normalizePlan,
} from '@/lib/entitlements';
import type { Plan, ProductId, SubscriptionStatus, UserSession } from '@/types';

let configured = false;

export type SubscriptionSnapshot = Pick<
  UserSession,
  'plan' | 'subscriptionStatus' | 'trialEndsAt' | 'productId' | 'willRenew' | 'entitlements'
>;

const emptySnapshot = (): SubscriptionSnapshot => ({
  plan: 'none',
  subscriptionStatus: 'none',
  entitlements: [],
});

export function subscriptionFromCustomerInfo(info: CustomerInfo): SubscriptionSnapshot {
  const active = info.entitlements.active;
  const pro = active[ENTITLEMENT_PRO];
  const basic = active[ENTITLEMENT_BASIC] ?? active[ENTITLEMENT_LEGACY_PREMIUM] ?? active[publicConfig.revenueCatEntitlementId];
  const entitlement = pro ?? basic;

  if (!entitlement) return emptySnapshot();

  const plan: Plan = pro
    ? 'pro'
    : String(entitlement.periodType).toUpperCase() === 'TRIAL'
      ? 'trial'
      : 'basic';

  let status: SubscriptionStatus = 'active';
  if (!entitlement.willRenew) status = 'cancelled';

  return {
    plan: normalizePlan(plan),
    subscriptionStatus: status,
    trialEndsAt: entitlement.expirationDate,
    productId: entitlement.productIdentifier,
    willRenew: entitlement.willRenew,
    entitlements: Object.keys(active),
  };
}

export async function configurePurchases(appUserId: string) {
  if (configured || Platform.OS === 'web' || !isRevenueCatConfigured(Platform.OS)) return;
  const apiKey =
    Platform.OS === 'ios' ? publicConfig.revenueCatIosKey : publicConfig.revenueCatAndroidKey;
  if (!apiKey) return;
  try {
    Purchases.configure({ apiKey, appUserID: appUserId });
    configured = true;
  } catch {
    // Expo Go and other clients without the native Purchases module still boot.
    configured = false;
  }
}

export const isPurchasesReady = () => configured;

const productMatchers: Record<ProductId, string[]> = {
  [PRODUCT_IDS.basicMonthly]: ['basic_monthly', 'basicmonthly', 'monthly'],
  [PRODUCT_IDS.basicYearly]: ['basic_yearly', 'basicyearly', 'yearly', 'annual'],
  [PRODUCT_IDS.proMonthly]: ['pro_monthly', 'promonthly'],
  [PRODUCT_IDS.proYearly]: ['pro_yearly', 'proyearly'],
};

function findPackage(packages: PurchasesPackage[], productId: ProductId) {
  const exact = packages.find(
    (item) =>
      item.product.identifier === productId ||
      item.identifier === productId ||
      item.product.identifier.includes(productId),
  );
  if (exact) return exact;

  const needles = productMatchers[productId];
  return packages.find((item) =>
    needles.some((needle) =>
      `${item.identifier} ${item.product.identifier}`.toLowerCase().includes(needle),
    ),
  );
}

export async function purchaseProduct(productId: ProductId) {
  if (!configured) {
    throw new Error(
      'Purchases are not available in this build. Use an EAS development or preview build with RevenueCat configured.',
    );
  }

  const offerings = await Purchases.getOfferings();
  const pkg = findPackage(offerings.current?.availablePackages ?? [], productId);
  if (!pkg) {
    throw new Error(
      'This subscription product is not available yet. Configure Google Play products in RevenueCat, then restore or try again.',
    );
  }

  const result = await Purchases.purchasePackage(pkg);
  return subscriptionFromCustomerInfo(result.customerInfo);
}

export async function restorePurchases() {
  if (!configured) {
    throw new Error('Purchases are not available in this build.');
  }
  return subscriptionFromCustomerInfo(await Purchases.restorePurchases());
}

export async function customerInfo() {
  if (!configured) return emptySnapshot();
  return subscriptionFromCustomerInfo(await Purchases.getCustomerInfo());
}
