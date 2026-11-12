export const PLAN_CONFIG = {
  basic: {
    id: 'basic' as const,
    price: 0,
    aiGenerationsPerDay: 20,
    adsEnabled: true,
  },
  pro: {
    id: 'pro' as const,
    monthlyPrice: 299,
    yearlyPrice: 2500,
    aiGenerationsPerDay: 80,
    adsEnabled: false,
  },
} as const;

export type ServerPlanId = 'basic' | 'pro';

export const PRO_ONLY_AI_KINDS = new Set(['flashcards', 'quiz', 'schedule']);

export function dailyAiLimitForPlan(plan: ServerPlanId) {
  return plan === 'pro' ? PLAN_CONFIG.pro.aiGenerationsPerDay : PLAN_CONFIG.basic.aiGenerationsPerDay;
}

export function aiLimitReachedMessage(plan: ServerPlanId) {
  if (plan === 'pro') {
    return `You have reached today’s ${PLAN_CONFIG.pro.aiGenerationsPerDay}-generation AI limit. It resets at the next UTC midnight.`;
  }
  return `You have reached today’s ${PLAN_CONFIG.basic.aiGenerationsPerDay}-generation limit on Basic. Upgrade to Pro for ${PLAN_CONFIG.pro.aiGenerationsPerDay} generations per day.`;
}
