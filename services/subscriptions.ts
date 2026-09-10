import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Plan, ProductId, SubscriptionStatus } from '@/types';
import {
  ENTITLEMENT_BASIC,
  ENTITLEMENT_LEGACY_PREMIUM,
  ENTITLEMENT_PRO,
  PRODUCT_IDS,
} from '@/lib/entitlements';

const configuredEntitlement =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? ENTITLEMENT_LEGACY_PREMIUM;

let configured = false;

export const isRevenueCatConfigured = () =>
  Boolean(
    Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    }),
  );

export async function configurePurchases(appUserId: string) {
  if (configured || !isRevenueCatConfigured() || Platform.OS === 'web') {
    return;
  }

  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

  if (!apiKey) {
    return;
  }

  Purchases.configure({ apiKey, appUserID: appUserId });
  configured = true;
}

const productPlan = (productId?: string | null): Plan => {
  const id = (productId ?? '').toLowerCase();

  if (id.includes('pro')) {
    return 'pro';
  }

  if (id.includes('basic') || id.includes('monthly') || id.includes('yearly')) {
    return 'basic';
  }

  return 'basic';
};

export function subscriptionFromCustomerInfo(info: CustomerInfo): {
  plan: Plan;
  status: SubscriptionStatus;
  expiresAt?: string;
  productId?: string;
  willRenew?: boolean;
} {
  const entitlements = info.entitlements.active;
  const pro =
    entitlements[ENTITLEMENT_PRO] ??
    (configuredEntitlement === ENTITLEMENT_PRO ? entitlements[configuredEntitlement] : undefined);
  const basic =
    entitlements[ENTITLEMENT_BASIC] ??
    entitlements[ENTITLEMENT_LEGACY_PREMIUM] ??
    entitlements[configuredEntitlement];
  const active = pro ?? basic;

  if (!active) {
    return { plan: 'none', status: 'none' };
  }

  const billingIssue = Boolean(
    (active as { billingIssueDetectedAt?: string | null }).billingIssueDetectedAt,
  );

  const period = String(active.periodType || '').toUpperCase();
  const plan: Plan =
    period === 'TRIAL' ? 'trial' : pro ? 'pro' : productPlan(active.productIdentifier);

  const status: SubscriptionStatus = billingIssue
    ? 'failed'
    : active.willRenew
      ? 'active'
      : 'cancelled';

  return {
    plan,
    status,
    expiresAt: active.expirationDate ?? undefined,
    productId: active.productIdentifier,
    willRenew: active.willRenew,
  };
}

const packageMatches = (candidate: PurchasesPackage, productId: ProductId) => {
  const identifier = `${candidate.identifier} ${candidate.product.identifier}`.toLowerCase();
  const target = productId.toLowerCase();
  return identifier.includes(target) || candidate.product.identifier === productId;
};

export async function getOffering(): Promise<PurchasesOffering | null> {
  if (!configured) {
    return null;
  }

  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchaseProduct(productId: ProductId) {
  if (!configured) {
    throw new Error('RevenueCat is not configured for this platform.');
  }

  const offering = await getOffering();
  const pkg = offering?.availablePackages.find((candidate) =>
    packageMatches(candidate, productId),
  );

  if (!pkg) {
    throw new Error(`No RevenueCat package is configured for ${productId}.`);
  }

  const result = await Purchases.purchasePackage(pkg);
  return subscriptionFromCustomerInfo(result.customerInfo);
}

/** @deprecated Use purchaseProduct with a Basic or Pro product id. */
export async function purchase(plan: 'monthly' | ProductId = 'monthly') {
  if (plan === 'monthly') {
    return purchaseProduct(PRODUCT_IDS.basicMonthly);
  }

  return purchaseProduct(plan);
}

export async function restorePurchases() {
  if (!configured) {
    throw new Error('RevenueCat is not configured for this platform.');
  }

  return subscriptionFromCustomerInfo(await Purchases.restorePurchases());
}

export async function customerInfo() {
  if (!configured) {
    return { plan: 'none' as Plan, status: 'none' as SubscriptionStatus };
  }

  return subscriptionFromCustomerInfo(await Purchases.getCustomerInfo());
}

export function listenForCustomerInfo(
  callback: (info: ReturnType<typeof subscriptionFromCustomerInfo>) => void,
) {
  if (!isRevenueCatConfigured() || Platform.OS === 'web') {
    return () => undefined;
  }

  const listener = (info: CustomerInfo) => {
    callback(subscriptionFromCustomerInfo(info));
  };

  Purchases.addCustomerInfoUpdateListener(listener);

  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export { PRODUCT_IDS };
