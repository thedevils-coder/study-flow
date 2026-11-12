import {
  getDailyAiLimit,
  getPlanConfig,
  isProUser,
  PLAN_CONFIG,
  PRO_ONLY_AI_KINDS,
  shouldShowAds,
} from '@/lib/plans';
import type { Plan, SubscriptionStatus, SubscriptionTier, UserSession } from '@/types';

export { PRODUCT_IDS } from '@/lib/products';
export { getDailyAiLimit, getPlanConfig, isBasicUser, isProUser, shouldShowAds } from '@/lib/plans';

export const ENTITLEMENT_BASIC = 'basic';
export const ENTITLEMENT_PRO = 'pro';
export const ENTITLEMENT_LEGACY_PREMIUM = 'premium';

/** Paid Pro continues after cancel until expiry. Pending is not Pro. */
const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'cancelled', 'ending'];

export function normalizePlan(plan: string | null | undefined): Plan {
  const value = String(plan ?? '').trim().toLowerCase();
  if (value === 'pro') return 'pro';
  // Legacy stored plans, expired trials, and unsigned rows all become Basic.
  if (value === 'monthly' || value === 'premium' || value === 'trial' || value === 'basic' || value === 'none') {
    return 'basic';
  }
  return 'basic';
}

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  const ends = new Date(expiresAt);
  return !Number.isNaN(ends.valueOf()) && ends.getTime() <= Date.now();
}

export function getTier(session: UserSession | null | undefined): SubscriptionTier {
  if (!session) return 'basic';

  const plan = normalizePlan(session.plan);
  const status = session.subscriptionStatus;
  const entitlements = session.entitlements.map((item) => item.toLowerCase());
  const hasPro = entitlements.some((item) => item === ENTITLEMENT_PRO || item.includes('pro'));
  const expiresAt = session.expiresAt ?? session.trialEndsAt;

  if (!ACTIVE_STATUSES.includes(status) || isExpired(expiresAt)) {
    return 'basic';
  }

  if (hasPro || plan === 'pro') return 'pro';
  return 'basic';
}

export function hasBasicAccess(tier: SubscriptionTier) {
  return tier === 'basic' || tier === 'pro';
}

export function hasProAccess(tier: SubscriptionTier) {
  return isProUser(tier);
}

export function canUseKind(
  tier: SubscriptionTier,
  kind: 'notes' | 'summary' | 'flashcards' | 'quiz' | 'explain' | 'leo' | 'schedule' | 'other',
) {
  if (!hasBasicAccess(tier)) return false;
  if ((PRO_ONLY_AI_KINDS as readonly string[]).includes(kind)) {
    return hasProAccess(tier);
  }
  return true;
}

export function dailyAiLimit(tier: SubscriptionTier) {
  return getDailyAiLimit(tier);
}

export function displayPlanLabel(tier: SubscriptionTier) {
  return getPlanConfig(tier).id === 'pro' ? 'Pro' : 'Basic';
}

export function adsEnabledFor(session: UserSession | null | undefined, tier: SubscriptionTier) {
  return shouldShowAds(session, tier);
}

export function planPriceCopy() {
  return {
    basic: PLAN_CONFIG.basic.price,
    proMonthly: PLAN_CONFIG.pro.monthlyPrice,
    proYearly: PLAN_CONFIG.pro.yearlyPrice,
  };
}
