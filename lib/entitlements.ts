import { Plan, Session, SubscriptionTier } from '@/types';

export const PRODUCT_IDS = {
  basicMonthly: 'studyflow_basic_monthly',
  basicYearly: 'studyflow_basic_yearly',
  proMonthly: 'studyflow_pro_monthly',
  proYearly: 'studyflow_pro_yearly',
} as const;

export const ENTITLEMENT_BASIC = 'basic';
export const ENTITLEMENT_PRO = 'pro';
export const ENTITLEMENT_LEGACY_PREMIUM = 'premium';

export function normalizePlan(plan: Plan | string | null | undefined): Plan {
  if (plan === 'monthly') {
    return 'basic';
  }

  if (plan === 'trial' || plan === 'basic' || plan === 'pro') {
    return plan;
  }

  return 'none';
}

export function getTier(session: Session | null | undefined): SubscriptionTier {
  if (!session) {
    return 'free';
  }

  const plan = normalizePlan(session.plan);
  const status = session.subscriptionStatus;

  if (status === 'expired' || status === 'refunded' || status === 'none') {
    if (plan === 'trial' && session.trialEndsAt) {
      const ends = new Date(session.trialEndsAt);
      if (!Number.isNaN(ends.valueOf()) && ends.getTime() > Date.now()) {
        return 'trial';
      }
    }

    return 'free';
  }

  if (plan === 'pro') {
    return 'pro';
  }

  if (plan === 'trial') {
    return 'trial';
  }

  if (plan === 'basic' || plan === 'monthly') {
    return 'basic';
  }

  if (status === 'active' || status === 'cancelled' || status === 'ending') {
    return 'basic';
  }

  return 'free';
}

export function hasBasicAi(tier: SubscriptionTier) {
  return tier === 'trial' || tier === 'basic' || tier === 'pro';
}

export function hasProAi(tier: SubscriptionTier) {
  return tier === 'pro';
}

export function canUseKind(
  tier: SubscriptionTier,
  kind: 'notes' | 'summary' | 'flashcards' | 'quiz' | 'explain' | 'leo' | 'schedule' | 'other',
) {
  if (!hasBasicAi(tier)) {
    return false;
  }

  if (kind === 'flashcards' || kind === 'quiz') {
    return hasProAi(tier);
  }

  return true;
}

export function dailyAiLimit(tier: SubscriptionTier) {
  if (tier === 'pro') {
    return 80;
  }

  if (tier === 'trial' || tier === 'basic') {
    return 10;
  }

  return 0;
}

export function maxAiTokens(tier: SubscriptionTier) {
  return hasProAi(tier) ? 2500 : 800;
}

export function canDownloadAi(tier: SubscriptionTier) {
  return hasProAi(tier);
}

export function canUseAdvancedAnalytics(tier: SubscriptionTier) {
  return hasProAi(tier);
}
