import Constants from 'expo-constants';

import { extraFlag } from '@/lib/tester-core';
import { normalizeSupabaseUrl } from '@/lib/supabase-url';

function readExtra(): Record<string, unknown> {
  const expoConfig = Constants.expoConfig as { extra?: Record<string, unknown> } | null | undefined;
  const manifest = Constants.manifest as { extra?: Record<string, unknown> } | null | undefined;
  return expoConfig?.extra ?? manifest?.extra ?? {};
}

const extra = readExtra();

const env = (key: string) => {
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;
  const fromExtra = extra[key];
  return typeof fromExtra === 'string' ? fromExtra : '';
};

const extraString = (key: string) => {
  const value = extra[key];
  return typeof value === 'string' ? value : '';
};

const testerAccountEnabled = extraFlag(extra.testerAccountEnabled);

// Static `process.env.EXPO_PUBLIC_*` member access is required for Expo production
// inlining (babel-preset-expo). Dynamic `process.env[key]` is left as a runtime
// lookup and is empty in production web bundles.
export const publicConfig = {
  supabaseUrl: normalizeSupabaseUrl(
    process.env.EXPO_PUBLIC_SUPABASE_URL || extraString('EXPO_PUBLIC_SUPABASE_URL'),
  ),
  supabasePublishableKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || extraString('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  testerEmail: testerAccountEnabled === false ? '' : env('EXPO_PUBLIC_TESTER_EMAIL') || extraString('testerEmail'),
  testerPassword:
    testerAccountEnabled === false
      ? ''
      : env('EXPO_PUBLIC_TESTER_PASSWORD') || extraString('testerPassword') || extraString('EXPO_PUBLIC_TESTER_PASSWORD'),
};

export const isSupabaseConfigured = Boolean(
  publicConfig.supabaseUrl && publicConfig.supabasePublishableKey,
);

export const isTesterPasswordConfigured = Boolean(publicConfig.testerPassword);

