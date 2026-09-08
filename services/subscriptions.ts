import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { Plan, SubscriptionStatus } from '@/types';

const entitlement = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'premium';
let configured = false;
export const isRevenueCatConfigured = () => Boolean(Platform.select({ ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY, android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY }));

export async function configurePurchases(appUserId: string) {
  if (configured || !isRevenueCatConfigured() || Platform.OS === 'web') return;
  const apiKey = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  if (!apiKey) return;
  Purchases.configure({ apiKey, appUserID: appUserId });
  configured = true;
}

export function subscriptionFromCustomerInfo(info: CustomerInfo): { plan: Plan; status: SubscriptionStatus; expiresAt?: string } {
  const active = info.entitlements.active[entitlement];
  if (!active) return { plan: 'none', status: 'none' };
  const plan: Plan = String(active.periodType) === 'TRIAL' ? 'trial' : 'monthly';
  return { plan, status: active.willRenew ? 'active' : 'cancelled', expiresAt: active.expirationDate ?? undefined };
}

export async function purchase(plan: 'monthly') {
  if (!configured) throw new Error('RevenueCat is not configured for this platform.');
  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages.find((candidate: PurchasesPackage) => candidate.identifier.toLowerCase().includes(plan));
  // The store product must carry the 15-day introductory free trial. This app
  // never creates a ₹0 product or grants a trial locally.
  if (!pkg) throw new Error(`No RevenueCat monthly package is configured.`);
  const result = await Purchases.purchasePackage(pkg);
  return subscriptionFromCustomerInfo(result.customerInfo);
}

export async function restorePurchases() { return subscriptionFromCustomerInfo(await Purchases.restorePurchases()); }
export async function customerInfo() { return subscriptionFromCustomerInfo(await Purchases.getCustomerInfo()); }
