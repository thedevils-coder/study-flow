/**
 * Official Google test IDs for development and preview.
 * Production unit IDs must come from EXPO_PUBLIC_ADMOB_* env (EAS production).
 * This file never invents production ad unit IDs.
 */
export const GOOGLE_TEST_AD_IDS = {
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',
  iosAppId: 'ca-app-pub-3940256099942544~1458002511',
  androidBanner: 'ca-app-pub-3940256099942544/6300978111',
  androidInterstitial: 'ca-app-pub-3940256099942544/1033173712',
  iosBanner: 'ca-app-pub-3940256099942544/2934735716',
  iosInterstitial: 'ca-app-pub-3940256099942544/4411468910',
} as const;

const PRODUCTION_PROFILE = process.env.EAS_BUILD_PROFILE === 'production';

function envValue(key: string) {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : '';
}

export function googleMobileAdsAppIds() {
  if (!PRODUCTION_PROFILE) {
    return { android: GOOGLE_TEST_AD_IDS.androidAppId, ios: GOOGLE_TEST_AD_IDS.iosAppId };
  }
  return {
    android: envValue('EXPO_PUBLIC_ADMOB_ANDROID_APP_ID') || GOOGLE_TEST_AD_IDS.androidAppId,
    ios: envValue('EXPO_PUBLIC_ADMOB_IOS_APP_ID') || GOOGLE_TEST_AD_IDS.iosAppId,
  };
}

export function bannerAdUnitId(platform: 'android' | 'ios' | 'web' | string) {
  if (!PRODUCTION_PROFILE) {
    return platform === 'ios' ? GOOGLE_TEST_AD_IDS.iosBanner : GOOGLE_TEST_AD_IDS.androidBanner;
  }
  if (platform === 'ios') return envValue('EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID') || GOOGLE_TEST_AD_IDS.iosBanner;
  return envValue('EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID') || GOOGLE_TEST_AD_IDS.androidBanner;
}

export function interstitialAdUnitId(platform: 'android' | 'ios' | 'web' | string) {
  if (!PRODUCTION_PROFILE) {
    return platform === 'ios' ? GOOGLE_TEST_AD_IDS.iosInterstitial : GOOGLE_TEST_AD_IDS.androidInterstitial;
  }
  if (platform === 'ios') {
    return envValue('EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_UNIT_ID') || GOOGLE_TEST_AD_IDS.iosInterstitial;
  }
  return envValue('EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID') || GOOGLE_TEST_AD_IDS.androidInterstitial;
}

export const AD_INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;
