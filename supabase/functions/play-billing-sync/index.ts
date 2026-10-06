/// <reference path="../runtime.d.ts" />
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../database.types.ts';
import { PlayApiError } from '../_shared/google-play-api.ts';
import { acknowledgeIfNeeded, upsertVerifiedSubscription, verifyPlayPurchase } from '../_shared/play-verify.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: 'Supabase is not configured.' }, 503);
    }

    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'Missing Authorization header.' }, 401);

    const userClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unable to verify authenticated user.' }, 401);
    }

    const payload = (await req.json().catch(() => ({}))) as {
      purchaseToken?: unknown;
      productId?: unknown;
    };
    const purchaseToken = typeof payload.purchaseToken === 'string' ? payload.purchaseToken.trim() : '';
    if (!purchaseToken) return json({ error: 'purchaseToken is required.' }, 400);

    const verified = await verifyPlayPurchase(purchaseToken);
    const linkedAccount = verified.mapped.obfuscatedAccountId;
    if (linkedAccount && linkedAccount !== user.id) {
      return json({ error: 'This Google Play purchase belongs to a different Study Flow account.' }, 403);
    }

    const admin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
    await upsertVerifiedSubscription(admin, user.id, purchaseToken, verified.mapped);
    await acknowledgeIfNeeded(verified.purchase, verified.productId, purchaseToken);

    return json({
      ok: true,
      subscription: {
        plan: verified.mapped.plan,
        subscriptionStatus: verified.mapped.state,
        trialEndsAt: verified.mapped.expiresAt,
        productId: verified.mapped.productId,
        willRenew: verified.mapped.willRenew,
        entitlements: verified.mapped.entitlements,
      },
    });
  } catch (error) {
    if (error instanceof PlayApiError) {
      return json({ error: error.message }, error.status);
    }
    const message = error instanceof Error ? error.message : 'Unable to verify Google Play purchase.';
    return json({ error: message }, 500);
  }
});
