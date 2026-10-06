import type { Plan, SubscriptionStatus, SubscriptionTier, UserSession } from '@/types';

export { PRODUCT_IDS } from '@/lib/google-play-products';

export const ENTITLEMENT_BASIC = 'basic';
export const ENTITLEMENT_PRO = 'pro';
export const ENTITLEMENT_LEGACY_PREMIUM = 'premium';

/** Paid access continues after cancel until expiry. Pending is not paid access. */
const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'cancelled', 'ending'];

export function normalizePlan(plan: string | null | undefined): Plan {
  const value = String(plan ?? '').trim().toLowerCase();
  // Legacy stored plans from before Basic/Pro product IDs. Keep these mapped so
  // existing subscription rows do not lose access after the Play Billing migration.
  if (value === 'monthly' || value === 'premium') return 'basic';
  if (value === 'trial' || value === 'basic' || value === 'pro') return value;
  return 'none';
}

export function getTier(session: UserSession | null | undefined): SubscriptionTier {
  if (!session) return 'free';

  const plan = normalizePlan(session.plan);
  const status = session.subscriptionStatus;
  const entitlements = session.entitlements.map((item) => item.toLowerCase());
  const hasPro = entitlements.some((item) => item === ENTITLEMENT_PRO || item.includes('pro'));
  const hasBasic = entitlements.some(
    (item) =>
      item === ENTITLEMENT_BASIC ||
      item === ENTITLEMENT_LEGACY_PREMIUM ||
      item.includes('basic') ||
      item.includes('premium'),
  );

  if (status === 'expired' || status === 'refunded' || status === 'none' || status === 'failed' || status === 'pending') {
    if (plan === 'trial' && session.trialEndsAt) {
      const ends = new Date(session.trialEndsAt);
      if (!Number.isNaN(ends.valueOf()) && ends.getTime() > Date.now()) {
        return 'trial';
      }
    }
    return 'free';
  }

  if (session.trialEndsAt) {
    const ends = new Date(session.trialEndsAt);
    if (!Number.isNaN(ends.valueOf()) && ends.getTime() <= Date.now()) {
      return 'free';
    }
  }

  if (!ACTIVE_STATUSES.includes(status) && plan !== 'trial') {
    return 'free';
  }

  if (hasPro || plan === 'pro') return 'pro';
  if (plan === 'trial') return 'trial';
  if (hasBasic || plan === 'basic') return 'basic';
  if (ACTIVE_STATUSES.includes(status)) return 'basic';
  return 'free';
}

export function hasBasicAccess(tier: SubscriptionTier) {
  return tier === 'trial' || tier === 'basic' || tier === 'pro';
}

export function hasProAccess(tier: SubscriptionTier) {
  return tier === 'pro' || tier === 'trial';
}

export function canUseKind(
  tier: SubscriptionTier,
  kind: 'notes' | 'summary' | 'flashcards' | 'quiz' | 'explain' | 'leo' | 'schedule' | 'other',
) {
  if (!hasBasicAccess(tier)) return false;
  if (kind === 'flashcards' || kind === 'quiz' || kind === 'leo' || kind === 'schedule') {
    return hasProAccess(tier);
  }
  return true;
}

export function dailyAiLimit(tier: SubscriptionTier) {
  if (tier === 'pro') return 80;
  if (tier === 'trial' || tier === 'basic') return 10;
  return 0;
}

export function displayPlanLabel(tier: SubscriptionTier) {
  if (tier === 'pro') return 'Pro';
  if (tier === 'basic') return 'Basic';
  if (tier === 'trial') return 'Free trial';
  return 'Free';
}
