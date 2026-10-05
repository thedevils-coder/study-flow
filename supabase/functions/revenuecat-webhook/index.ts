/// <reference path="../runtime.d.ts" />
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../database.types.ts';

type RevenueCatEvent = {
  app_user_id?: string;
  type?: string;
  entitlement_ids?: string[];
  entitlement_id?: string;
  product_id?: string | null;
  expiration_at_ms?: number | null;
  will_renew?: boolean;
};

Deno.serve(async (request: Request) => {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    event?: RevenueCatEvent;
  } & RevenueCatEvent;
  const event = payload.event ?? payload;
  if (!event?.app_user_id) return new Response('Invalid event', { status: 400 });

  const admin = createClient<Database>(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const type = String(event.type || '');
  const state = type.includes('EXPIRATION')
    ? 'expired'
    : type.includes('CANCELLATION')
      ? 'cancelled'
      : type.includes('REFUND')
        ? 'refunded'
        : type.includes('BILLING_ISSUE')
          ? 'failed'
          : 'active';

  const entitlementIds: string[] = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];

  const { error } = await admin.from('subscriptions').upsert({
    user_id: event.app_user_id,
    entitlement_id: entitlementIds[0] ?? event.entitlement_id ?? null,
    entitlement_ids: entitlementIds,
    product_id: event.product_id ?? null,
    state,
    expires_at: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
    will_renew: Boolean(event.will_renew),
    updated_at: new Date().toISOString(),
  });

  return error ? new Response('Unable to sync subscription.', { status: 500 }) : new Response('ok');
});
