import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../database.types.ts';
import {
  acknowledgeSubscription,
  getSubscriptionPurchase,
  type PlayLineItem,
  type PlaySubscriptionPurchaseV2,
} from './google-play-api.ts';
import {
  isPlayProductId,
  PLAY_BILLING_PROVIDER,
  PLAY_PRODUCT_CATALOG,
  subscriptionStatusFromPlayState,
} from './play-products.ts';

export type VerifiedPlaySubscription = {
  userId: string;
  productId: string;
  entitlement: 'basic' | 'pro';
  plan: 'basic' | 'pro' | 'none';
  state: ReturnType<typeof subscriptionStatusFromPlayState>;
  expiresAt: string | null;
  willRenew: boolean;
  entitlements: string[];
  obfuscatedAccountId: string | null;
};

function pickLineItem(purchase: PlaySubscriptionPurchaseV2): PlayLineItem | null {
  const items = (purchase.lineItems ?? []).filter((item) => isPlayProductId(item.productId ?? ''));
  if (!items.length) return null;
  const pro = items.filter((item) => PLAY_PRODUCT_CATALOG[item.productId as keyof typeof PLAY_PRODUCT_CATALOG].entitlement === 'pro');
  const pool = pro.length ? pro : items;
  return [...pool].sort((a, b) => Date.parse(b.expiryTime || '0') - Date.parse(a.expiryTime || '0'))[0] ?? null;
}

export async function verifyPlayPurchase(purchaseToken: string): Promise<{
  purchase: PlaySubscriptionPurchaseV2;
  lineItem: PlayLineItem;
  productId: string;
  mapped: Omit<VerifiedPlaySubscription, 'userId'>;
}> {
  const purchase = await getSubscriptionPurchase(purchaseToken);
  const lineItem = pickLineItem(purchase);
  const productId = lineItem?.productId;
  if (!lineItem || !isPlayProductId(productId)) {
    throw new Error('This Google Play product is not a Study Flow Basic or Pro subscription.');
  }

  const catalog = PLAY_PRODUCT_CATALOG[productId];
  const state = subscriptionStatusFromPlayState(purchase.subscriptionState);
  const expiresAt = lineItem.expiryTime ? new Date(lineItem.expiryTime).toISOString() : null;
  const plan = state === 'pending' || state === 'expired' || state === 'failed' ? 'none' : catalog.plan;

  return {
    purchase,
    lineItem,
    productId,
    mapped: {
      productId,
      entitlement: catalog.entitlement,
      plan,
      state,
      expiresAt,
      willRenew: Boolean(lineItem.autoRenewingPlan?.autoRenewEnabled),
      entitlements: [catalog.entitlement],
      obfuscatedAccountId: purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null,
    },
  };
}

export async function upsertVerifiedSubscription(
  admin: SupabaseClient<Database>,
  userId: string,
  purchaseToken: string,
  mapped: Omit<VerifiedPlaySubscription, 'userId'>,
) {
  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    provider: PLAY_BILLING_PROVIDER,
    entitlement_id: mapped.entitlement,
    entitlement_ids: mapped.entitlements,
    product_id: mapped.productId,
    state: mapped.state,
    expires_at: mapped.expiresAt,
    will_renew: mapped.willRenew,
    purchase_token: purchaseToken,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message || 'Unable to store the verified subscription.');
}

export async function acknowledgeIfNeeded(purchase: PlaySubscriptionPurchaseV2, productId: string, purchaseToken: string) {
  const state = subscriptionStatusFromPlayState(purchase.subscriptionState);
  if (state === 'pending') return;
  const acknowledgement = String(purchase.acknowledgementState || '');
  if (acknowledgement.includes('PENDING') || acknowledgement === '') {
    await acknowledgeSubscription(productId, purchaseToken);
  }
}

export async function findUserIdForToken(
  admin: SupabaseClient<Database>,
  purchaseToken: string,
  obfuscatedAccountId: string | null,
) {
  if (obfuscatedAccountId) return obfuscatedAccountId;
  const { data } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('purchase_token', purchaseToken)
    .maybeSingle();
  return data?.user_id ?? null;
}
