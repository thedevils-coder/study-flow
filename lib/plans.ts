import type { Plan, SubscriptionTier, UserSession } from '@/types';

export const PLAN_IDS = {
  basic: 'basic',
  pro: 'pro',
} as const;

export const PLAN_CONFIG = {
  basic: {
    id: PLAN_IDS.basic,
    price: 0,
    monthlyPrice: 0,
    yearlyPrice: 0,
    aiGenerationsPerDay: 20,
    adsEnabled: true,
  },
  pro: {
    id: PLAN_IDS.pro,
    monthlyPrice: 299,
    yearlyPrice: 2500,
    aiGenerationsPerDay: 80,
    adsEnabled: false,
  },
} as const;

export const PRO_ONLY_AI_KINDS = ['flashcards', 'quiz', 'schedule'] as const;

export function getPlanConfig(tier: SubscriptionTier) {
  return tier === 'pro' ? PLAN_CONFIG.pro : PLAN_CONFIG.basic;
}

export function isProUser(tier: SubscriptionTier) {
  return tier === 'pro';
}

export function isBasicUser(tier: SubscriptionTier) {
  return tier === 'basic';
}

export function shouldShowAds(session: UserSession | null | undefined, tier: SubscriptionTier) {
  return Boolean(session) && getPlanConfig(tier).adsEnabled;
}

export function getDailyAiLimit(tier: SubscriptionTier) {
  return getPlanConfig(tier).aiGenerationsPerDay;
}

export function normalizeStoredPlan(plan: string | null | undefined): Plan {
  const value = String(plan ?? '').trim().toLowerCase();
  if (value === 'pro') return 'pro';
  return 'basic';
}

export function aiLimitReachedMessage(tier: SubscriptionTier) {
  if (tier === 'pro') {
    return `You have reached today’s ${PLAN_CONFIG.pro.aiGenerationsPerDay}-generation AI limit. It resets at the next UTC midnight.`;
  }
  return `You have reached today’s ${PLAN_CONFIG.basic.aiGenerationsPerDay}-generation limit on Basic. Upgrade to Pro for ${PLAN_CONFIG.pro.aiGenerationsPerDay} generations per day.`;
}
