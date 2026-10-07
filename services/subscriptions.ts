import { Platform } from 'react-native';

import { isSupabaseConfigured } from '@/lib/config';
import {
  PLAY_PRODUCT_ID_LIST,
  PLAY_PRODUCT_QUERY_SKUS,
  playProductEntry,
  type PlayProductCatalogEntry,
} from '@/lib/google-play-products';
import {
  displayPriceForBasePlan,
  hasBasePlanOffers,
  offerTokenForBasePlan,
  trialInfoForBasePlan,
} from '@/lib/google-play-offers';
import { getSupabase } from '@/lib/supabase';
import { hydrateProfile } from '@/services/profile';
import type { ProductId, UserSession } from '@/types';

export type SubscriptionSnapshot = Pick<
  UserSession,
  'plan' | 'subscriptionStatus' | 'trialEndsAt' | 'productId' | 'willRenew' | 'entitlements'
>;

export type StoreSubscriptionProduct = PlayProductCatalogEntry & {
  title: string;
  description: string;
  displayPrice: string;
  /** Set only from Google Play offer data. Null when Play did not return an eligible trial. */
  trialLabel: string | null;
};

export class PurchaseCancelledError extends Error {
  constructor() {
    super('Purchase cancelled.');
    this.name = 'PurchaseCancelledError';
  }
}

export class PurchasePendingError extends Error {
  constructor() {
    super('This purchase is pending. Access unlocks after Google Play completes payment.');
    this.name = 'PurchasePendingError';
  }
}

const emptySnapshot = (): SubscriptionSnapshot => ({
  plan: 'none',
  subscriptionStatus: 'none',
  entitlements: [],
});

export function snapshotFromSession(session: UserSession): SubscriptionSnapshot {
  return {
    plan: session.plan,
    subscriptionStatus: session.subscriptionStatus,
    trialEndsAt: session.trialEndsAt,
    productId: session.productId,
    willRenew: session.willRenew,
    entitlements: session.entitlements,
  };
}

let configured = false;
let appUserId = '';

function billingUnavailableMessage() {
  if (Platform.OS === 'web') {
    return 'Google Play subscriptions are available in the Android app, not on web.';
  }
  if (Platform.OS !== 'android') {
    return 'Google Play subscriptions are available on Android.';
  }
  return 'Purchases need an EAS Android build with Google Play Billing. This screen will not fake a successful purchase.';
}

type ExpoIapModule = typeof import('expo-iap');
type PlayPurchase = import('expo-iap').Purchase;
type PlaySubscription = import('expo-iap').ProductSubscription;

let iapModule: ExpoIapModule | null = null;

async function loadIap(): Promise<ExpoIapModule | null> {
  if (Platform.OS !== 'android') return null;
  if (iapModule) return iapModule;
  try {
    iapModule = await import('expo-iap');
    return iapModule;
  } catch {
    return null;
  }
}

export async function configurePurchases(userId: string) {
  appUserId = userId;
  if (configured || Platform.OS !== 'android') return;
  const iap = await loadIap();
  if (!iap) return;
  try {
    await iap.initConnection();
    configured = true;
  } catch {
    configured = false;
  }
}

export const isPurchasesReady = () => configured && Platform.OS === 'android';

function purchaseMatches(purchase: PlayPurchase, productId: string) {
  return purchase.productId === productId || Boolean(purchase.ids?.includes(productId));
}

function purchaseErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code.toLowerCase() : '';
}

function throwPurchaseFailure(error: unknown): never {
  const code = purchaseErrorCode(error);
  if (code.includes('user-cancelled') || code.includes('user_cancelled')) {
    throw new PurchaseCancelledError();
  }
  if (code.includes('pending') || code.includes('deferred')) {
    throw new PurchasePendingError();
  }
  if (error instanceof Error && error.message) throw error;
  throw new Error('Purchase did not complete.');
}

function isAlreadyOwned(error: unknown) {
  const code = purchaseErrorCode(error);
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return code.includes('already-owned') || code.includes('already_owned') || message.includes('already owned');
}

async function fetchSubscriptionCatalog(iap: ExpoIapModule): Promise<PlaySubscription[]> {
  const products = await iap.fetchProducts({
    skus: [...PLAY_PRODUCT_QUERY_SKUS],
    type: 'subs',
  });
  return (products ?? []).filter((item): item is PlaySubscription => item.type === 'subs');
}

function pickPurchase(result: PlayPurchase | PlayPurchase[] | null | undefined, playProductId: string) {
  const list = Array.isArray(result) ? result : result ? [result] : [];
  return list.find((item) => purchaseMatches(item, playProductId)) ?? list[0] ?? null;
}

function waitForPurchase(iap: ExpoIapModule, playProductId: string, timeoutMs = 120000) {
  let settled = false;
  let update: { remove: () => void } | null = null;
  let error: { remove: () => void } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const finish = (fn: () => void) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    update?.remove();
    error?.remove();
    fn();
  };

  const promise = new Promise<PlayPurchase>((resolve, reject) => {
    timer = setTimeout(() => {
      finish(() => reject(new Error('Timed out waiting for Google Play.')));
    }, timeoutMs);
    update = iap.purchaseUpdatedListener((purchase) => {
      if (purchaseMatches(purchase, playProductId)) {
        finish(() => resolve(purchase));
      }
    });
    error = iap.purchaseErrorListener((err) => {
      finish(() => reject(err));
    });
  });

  return {
    promise,
    cancel() {
      finish(() => undefined);
    },
  };
}

async function syncVerifiedPurchase(purchaseToken: string, productId?: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Purchases cannot be verified.');
  }

  const { data, error } = await getSupabase().functions.invoke('play-billing-sync', {
    method: 'POST',
    body: {
      purchaseToken,
      productId: productId ?? null,
    },
  });

  if (error) {
    const payload = data && typeof data === 'object' ? (data as { error?: string; message?: string }) : null;
    const message = payload?.error || payload?.message || error.message;
    if (/requested function was not found/i.test(error.message) || /404/.test(error.message)) {
      throw new Error(
        'The play-billing-sync Edge Function is not deployed. Deploy it and configure the Play Developer API service-account secret on the Edge Function before granting paid access.',
      );
    }
    throw new Error(message || 'Google Play purchase could not be verified.');
  }

  const payload = data && typeof data === 'object' ? (data as { error?: string; ok?: boolean }) : null;
  if (payload?.error) throw new Error(payload.error);
}

async function finishIfNeeded(iap: ExpoIapModule, purchase: PlayPurchase) {
  try {
    await iap.finishTransaction({ purchase, isConsumable: false });
  } catch {
    // Backend acknowledge is authoritative; a second client acknowledge may already be done.
  }
}

async function verifyAndFinish(iap: ExpoIapModule, purchase: PlayPurchase, session: UserSession) {
  if (purchase.purchaseState === 'pending') {
    throw new PurchasePendingError();
  }
  if ('isSuspendedAndroid' in purchase && purchase.isSuspendedAndroid) {
    throw new Error('This Google Play subscription is suspended. Fix payment in Google Play, then restore.');
  }
  const token = purchase.purchaseToken;
  if (!token) {
    throw new Error('Google Play did not return a purchase token. Paid access was not granted.');
  }

  await syncVerifiedPurchase(token, purchase.productId);
  await finishIfNeeded(iap, purchase);
  return snapshotFromSession(await hydrateProfile(session));
}

export async function listStoreSubscriptionProducts(): Promise<StoreSubscriptionProduct[]> {
  if (!configured) return [];
  const iap = await loadIap();
  if (!iap) return [];
  try {
    const products = await fetchSubscriptionCatalog(iap);
    return PLAY_PRODUCT_ID_LIST.flatMap((catalogId) => {
      const entry = playProductEntry(catalogId);
      if (!entry) return [];
      const product = products.find((item) => item.id === entry.playProductId);
      if (!product || !hasBasePlanOffers(product, entry.basePlanId)) return [];
      return [
        {
          ...entry,
          title: product.title || entry.label,
          description: product.description || '',
          displayPrice: displayPriceForBasePlan(product, entry.basePlanId),
          trialLabel: trialInfoForBasePlan(product, entry.basePlanId)?.trialLabel ?? null,
        },
      ];
    });
  } catch {
    return [];
  }
}

export async function purchaseProduct(productId: ProductId, session: UserSession) {
  if (!configured) {
    throw new Error(billingUnavailableMessage());
  }
  const iap = await loadIap();
  if (!iap) throw new Error(billingUnavailableMessage());

  const entry = playProductEntry(productId);
  if (!entry) {
    throw new Error('This subscription product is not a Study Flow Basic or Pro plan.');
  }

  const products = await fetchSubscriptionCatalog(iap);
  const product = products.find((item) => item.id === entry.playProductId);
  if (!product) {
    throw new Error(
      `This subscription product is not available in Google Play yet. Confirm product ID ${entry.playProductId} in Play Console, then restore or try again.`,
    );
  }

  const offerToken = offerTokenForBasePlan(product, entry.basePlanId);
  if (!offerToken) {
    throw new Error(
      `Google Play did not return an offer token for ${entry.playProductId} (${entry.basePlanId}). Confirm that base plan is active in Play Console.`,
    );
  }

  const pending = waitForPurchase(iap, entry.playProductId);
  try {
    const requested = await iap.requestPurchase({
      type: 'subs',
      request: {
        google: {
          skus: [entry.playProductId],
          obfuscatedAccountId: appUserId || session.id,
          subscriptionOffers: [{ sku: entry.playProductId, offerToken }],
        },
      },
    });
    const immediate = pickPurchase(requested, entry.playProductId);
    if (immediate) {
      pending.cancel();
      return verifyAndFinish(iap, immediate, session);
    }
    return verifyAndFinish(iap, await pending.promise, session);
  } catch (error) {
    pending.cancel();
    if (error instanceof PurchaseCancelledError || error instanceof PurchasePendingError) throw error;
    if (isAlreadyOwned(error)) {
      return restorePurchases(session);
    }
    throwPurchaseFailure(error);
  }
}

export async function restorePurchases(session: UserSession) {
  if (!configured) {
    throw new Error(billingUnavailableMessage());
  }
  const iap = await loadIap();
  if (!iap) throw new Error(billingUnavailableMessage());

  const purchases = await iap.getAvailablePurchases({ includeSuspendedAndroid: true });
  const playPurchases = purchases.filter((item) => item.purchaseToken && item.purchaseState !== 'pending');
  if (!playPurchases.length) {
    return snapshotFromSession(await hydrateProfile(session));
  }

  let lastError: unknown;
  let synced = 0;
  for (const purchase of playPurchases) {
    if ('isSuspendedAndroid' in purchase && purchase.isSuspendedAndroid) continue;
    const token = purchase.purchaseToken;
    if (!token) continue;
    try {
      await syncVerifiedPurchase(token, purchase.productId);
      await finishIfNeeded(iap, purchase);
      synced += 1;
    } catch (error) {
      lastError = error;
    }
  }

  if (!synced && lastError) throw lastError;
  return snapshotFromSession(await hydrateProfile(session));
}

export async function refreshPlayPurchases(session: UserSession) {
  if (!configured) return snapshotFromSession(await hydrateProfile(session));
  try {
    return await restorePurchases(session);
  } catch {
    return snapshotFromSession(await hydrateProfile(session));
  }
}

export async function customerInfo(session?: UserSession | null) {
  if (!session) return emptySnapshot();
  return snapshotFromSession(await hydrateProfile(session));
}
