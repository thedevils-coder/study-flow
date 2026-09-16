import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

const env = (key: string) => {
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;
  const fromExtra = extra[key];
  return typeof fromExtra === 'string' ? fromExtra : '';
};

const extraFlag = (value: unknown) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
};

const testerAccountEnabled = extraFlag(extra.testerAccountEnabled);

export const publicConfig = {
  supabaseUrl: env('EXPO_PUBLIC_SUPABASE_URL'),
  supabasePublishableKey: env('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  revenueCatIosKey: env('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY'),
  revenueCatAndroidKey: env('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY'),
  revenueCatEntitlementId: env('EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID') || 'basic',
  testerEmail: testerAccountEnabled === false ? '' : env('EXPO_PUBLIC_TESTER_EMAIL'),
  testerPassword: testerAccountEnabled === false ? '' : env('EXPO_PUBLIC_TESTER_PASSWORD'),
};

export const isSupabaseConfigured = Boolean(
  publicConfig.supabaseUrl && publicConfig.supabasePublishableKey,
);

export const isTesterPasswordConfigured = Boolean(publicConfig.testerPassword);

export const isRevenueCatConfigured = (platform: string) => {
  if (platform === 'ios') return Boolean(publicConfig.revenueCatIosKey);
  if (platform === 'android') return Boolean(publicConfig.revenueCatAndroidKey);
  return false;
};
