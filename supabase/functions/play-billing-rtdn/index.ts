/// <reference path="../runtime.d.ts" />
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../database.types.ts';
import { PlayApiError, playPackageName } from '../_shared/google-play-api.ts';
import {
  acknowledgeIfNeeded,
  findUserIdForToken,
  upsertVerifiedSubscription,
  verifyPlayPurchase,
} from '../_shared/play-verify.ts';

type PubSubPush = {
  message?: {
    data?: string;
    attributes?: Record<string, string>;
  };
  subscription?: string;
};

type DeveloperNotification = {
  version?: string;
  packageName?: string;
  eventTimeMillis?: string;
  subscriptionNotification?: {
    version?: string;
    notificationType?: number;
    purchaseToken?: string;
    subscriptionId?: string;
  };
};

function decodeNotification(data: string): DeveloperNotification | null {
  try {
    const json = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as DeveloperNotification;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('GOOGLE_PLAY_RTDN_SECRET')?.trim();
  if (secret) {
    const authorization = req.headers.get('authorization') || '';
    if (authorization !== `Bearer ${secret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const payload = (await req.json().catch(() => ({}))) as PubSubPush;
  const encoded = payload.message?.data;
  if (!encoded) return new Response('ok');

  const notification = decodeNotification(encoded);
  if (!notification) return new Response('Invalid notification', { status: 400 });

  const expectedPackage = playPackageName();
  if (notification.packageName && notification.packageName !== expectedPackage) {
    return new Response('Unexpected package', { status: 400 });
  }

  const purchaseToken = notification.subscriptionNotification?.purchaseToken?.trim();
  if (!purchaseToken) return new Response('ok');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response('Supabase is not configured.', { status: 503 });
    }

    const verified = await verifyPlayPurchase(purchaseToken);
    const admin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
    const userId = await findUserIdForToken(admin, purchaseToken, verified.mapped.obfuscatedAccountId);
    if (!userId) {
      // Fail closed: a valid Play token without an app user mapping cannot grant access.
      return new Response('ok');
    }

    await upsertVerifiedSubscription(admin, userId, purchaseToken, verified.mapped);
    await acknowledgeIfNeeded(verified.purchase, verified.productId, purchaseToken);
    return new Response('ok');
  } catch (error) {
    if (error instanceof PlayApiError && error.status === 400) {
      return new Response('ok');
    }
    const message = error instanceof Error ? error.message : 'Unable to process Play notification.';
    return new Response(message, { status: 500 });
  }
});
