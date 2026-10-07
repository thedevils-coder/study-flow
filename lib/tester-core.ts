import { getTier, hasProAccess } from '@/lib/entitlements';
import type { UserSession } from '@/types';

export const TESTER_EMAIL = 'tester@getstudyflow.in';
export const TESTER_DISPLAY_NAME = 'Study Flow Tester';
export const TESTER_SEED_VERSION = 1;
export const TESTER_PRODUCT_ID = 'tester_demo_pro';

export function extraFlag(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

export function isTesterBuildEnabled(input: {
  testerAccountEnabled?: boolean;
  isDev?: boolean;
} = {}) {
  if (input.testerAccountEnabled === false) return false;
  if (input.testerAccountEnabled === true) return true;
  if (typeof input.isDev === 'boolean') return input.isDev;
  return false;
}

export function resolveTesterEmail(configured?: string | null) {
  const value = configured?.trim();
  return (value || TESTER_EMAIL).toLowerCase();
}

export function isTesterEmail(email: string | null | undefined, configuredEmail?: string | null) {
  return (email ?? '').trim().toLowerCase() === resolveTesterEmail(configuredEmail);
}

export function testerDemoSnapshot() {
  return {
    plan: 'pro' as const,
    subscriptionStatus: 'active' as const,
    expiresAt: null,
    trialEndsAt: null,
    productId: TESTER_PRODUCT_ID,
    willRenew: false,
    entitlements: ['pro'] as string[],
  };
}

export function applyTesterDemoAccess(
  session: UserSession,
  now = new Date(),
  enabled = false,
  configuredEmail?: string | null,
): UserSession {
  void now;
  if (!enabled || !isTesterEmail(session.email, configuredEmail)) return session;
  if (hasProAccess(getTier(session))) return session;
  return { ...session, ...testerDemoSnapshot() };
}

export const TESTER_COPY = {
  badge: 'TESTER / DEMO',
  button: 'Tester / Demo Account',
  home: 'This is the Study Flow tester profile with sample study data. Reset it anytime from Settings.',
  subscription:
    'Tester / Demo Pro access is for navigating the app. Google Play purchases are not faked and still require an Android build with Play Billing plus Play products.',
  ai: 'Sample AI Meter history is loaded. Live Leo / AI replies still use the real Edge Function. If that service is not configured, you will see a labeled message instead of a crash.',
  missingPassword:
    'Set EXPO_PUBLIC_TESTER_PASSWORD for this preview/development build, then create the tester user in Supabase Auth (email confirmation off, or confirm once).',
  productionHidden: 'The tester account is only available in development and preview builds.',
};
