import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { isMissingColumnError, isMissingRelationError } from '@/lib/errors';
import type { UserSession } from '@/types';

type ProfileRow = {
  display_name: string | null;
  role: 'user' | 'admin' | null;
};

type SubscriptionRow = {
  state: UserSession['subscriptionStatus'] | null;
  entitlement_id: string | null;
  entitlement_ids: string[] | null;
  product_id: string | null;
  expires_at: string | null;
  will_renew: boolean | null;
};

export async function hydrateProfile(session: UserSession): Promise<UserSession> {
  if (!isSupabaseConfigured) return session;

  const client = getSupabase();
  const [{ data: profileData, error: profileError }, { data: subscription, error: subscriptionError }] =
    await Promise.all([
      client.from('profiles').select('display_name, role').eq('id', session.id).maybeSingle(),
      client
        .from('subscriptions')
        .select('state, entitlement_id, entitlement_ids, product_id, expires_at, will_renew')
        .eq('user_id', session.id)
        .maybeSingle(),
    ]);

  if (profileError && !isMissingRelationError(profileError) && !isMissingColumnError(profileError)) {
    throw profileError;
  }

  let profileRow = (profileData as ProfileRow | null) ?? null;
  if (!profileRow && !profileError) {
    const inserted = await client
      .from('profiles')
      .insert({ id: session.id, display_name: session.name || 'Student' })
      .select('display_name, role')
      .maybeSingle();
    if (!inserted.error) {
      profileRow = (inserted.data as ProfileRow | null) ?? {
        display_name: session.name || 'Student',
        role: 'user',
      };
    }
  }

  const next: UserSession = { ...session };

  if (profileRow) {
    next.name = profileRow.display_name || session.name;
    next.role = profileRow.role === 'admin' ? 'admin' : 'user';
  }

  if (subscriptionError && !isMissingRelationError(subscriptionError) && !isMissingColumnError(subscriptionError)) {
    throw subscriptionError;
  }

  const subscriptionRow = subscription as SubscriptionRow | null;

  if (subscriptionRow) {
    next.subscriptionStatus = subscriptionRow.state ?? 'none';
    next.productId = subscriptionRow.product_id;
    next.willRenew = Boolean(subscriptionRow.will_renew);
    next.trialEndsAt = subscriptionRow.expires_at;
    next.entitlements = [
      ...(subscriptionRow.entitlement_ids ?? []),
      subscriptionRow.entitlement_id ?? '',
    ].filter(Boolean);

    const entitlements = next.entitlements.map((item) => item.toLowerCase());
    if (entitlements.some((item) => item.includes('pro'))) next.plan = 'pro';
    else if (entitlements.some((item) => item.includes('trial'))) next.plan = 'trial';
    else if (entitlements.some((item) => item.includes('basic') || item.includes('premium'))) {
      next.plan = 'basic';
    }
  }

  return next;
}

export async function updateDisplayName(userId: string, name: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const { error } = await getSupabase()
    .from('profiles')
    .update({ display_name: name.trim() || 'Student' })
    .eq('id', userId);
  if (error) throw error;
}
