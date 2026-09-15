import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const env = (key: string) => process.env[key] ?? extra[key] ?? '';

export const publicConfig = {
  supabaseUrl: env('EXPO_PUBLIC_SUPABASE_URL'),
  supabasePublishableKey: env('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  revenueCatIosKey: env('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY'),
  revenueCatAndroidKey: env('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY'),
  revenueCatEntitlementId: env('EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID') || 'basic',
};

export const isSupabaseConfigured = Boolean(
  publicConfig.supabaseUrl && publicConfig.supabasePublishableKey,
);

export const isRevenueCatConfigured = (platform: string) => {
  if (platform === 'ios') return Boolean(publicConfig.revenueCatIosKey);
  if (platform === 'android') return Boolean(publicConfig.revenueCatAndroidKey);
  return false;
};
