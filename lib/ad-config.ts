import Constants from 'expo-constants';
import { Platform } from 'react-native';

const GOOGLE_TEST_IDS = {
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',
  iosAppId: 'ca-app-pub-3940256099942544~1458002511',
  androidBanner: 'ca-app-pub-3940256099942544/6300978111',
  androidInterstitial: 'ca-app-pub-3940256099942544/1033173712',
  iosBanner: 'ca-app-pub-3940256099942544/2934735716',
  iosInterstitial: 'ca-app-pub-3940256099942544/4411468910',
} as const;

type AdmobExtra = {
  useTestIds?: boolean;
  androidAppId?: string;
  iosAppId?: string;
  androidBannerUnitId?: string;
  androidInterstitialUnitId?: string;
  iosBannerUnitId?: string;
  iosInterstitialUnitId?: string;
};

function extra(): Record<string, unknown> {
  const expoConfig = Constants.expoConfig as { extra?: Record<string, unknown> } | null | undefined;
  return expoConfig?.extra ?? {};
}

function extraAdmob(): AdmobExtra {
  const value = extra().admob;
  return value && typeof value === 'object' ? (value as AdmobExtra) : {};
}

function env(key: string) {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

export function useTestAdIds() {
  const configured = extraAdmob().useTestIds;
  if (typeof configured === 'boolean') return configured;
  return extra().easBuildProfile !== 'production';
}

export function admobAppId(platform: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android') {
  const admob = extraAdmob();
  if (useTestAdIds()) {
    return platform === 'ios' ? GOOGLE_TEST_IDS.iosAppId : GOOGLE_TEST_IDS.androidAppId;
  }
  return platform === 'ios'
    ? firstNonEmpty(admob.iosAppId, env('EXPO_PUBLIC_ADMOB_IOS_APP_ID'))
    : firstNonEmpty(admob.androidAppId, env('EXPO_PUBLIC_ADMOB_ANDROID_APP_ID'));
}

export function bannerAdUnitId() {
  const admob = extraAdmob();
  if (useTestAdIds() || Platform.OS === 'web') {
    return Platform.OS === 'ios' ? GOOGLE_TEST_IDS.iosBanner : GOOGLE_TEST_IDS.androidBanner;
  }
  if (Platform.OS === 'ios') {
    return firstNonEmpty(admob.iosBannerUnitId, env('EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID'));
  }
  return firstNonEmpty(admob.androidBannerUnitId, env('EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID'));
}

export function interstitialAdUnitId() {
  const admob = extraAdmob();
  if (useTestAdIds() || Platform.OS === 'web') {
    return Platform.OS === 'ios' ? GOOGLE_TEST_IDS.iosInterstitial : GOOGLE_TEST_IDS.androidInterstitial;
  }
  if (Platform.OS === 'ios') {
    return firstNonEmpty(admob.iosInterstitialUnitId, env('EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_UNIT_ID'));
  }
  return firstNonEmpty(admob.androidInterstitialUnitId, env('EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID'));
}

export const GOOGLE_TEST_AD_IDS = GOOGLE_TEST_IDS;
