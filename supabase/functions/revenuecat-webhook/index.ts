import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.headers.get('authorization') !== `Bearer ${Deno.env.get('REVENUECAT_WEBHOOK_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { event } = await request.json();

  if (!event?.app_user_id) {
    return new Response('Invalid event', { status: 400 });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
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

  const entitlementIds = [
    ...(Array.isArray(event.entitlement_ids) ? event.entitlement_ids : []),
    event.entitlement_id,
  ].filter(Boolean);

  if (String(event.period_type || event.periodType || '').toUpperCase() === 'TRIAL') {
    entitlementIds.push('trial');
  }
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

  return error ? new Response(error.message, { status: 500 }) : new Response('ok');
});
