/**
 * Dynamic Expo config.
 *
 * Preview / development / local builds must run the JS bundle that ships
 * inside the APK. Checking u.expo.dev on launch is what produced:
 *   java.io.IOException: Failed to download remote update
 *
 * Production keeps EAS Updates enabled so a future release can still ship
 * OTA JS. ON_ERROR_RECOVERY means a missing first update still boots the
 * embedded bundle instead of crashing.
 */
const GOOGLE_TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const GOOGLE_TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const GOOGLE_TEST_ANDROID_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const GOOGLE_TEST_ANDROID_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';
const GOOGLE_TEST_IOS_BANNER = 'ca-app-pub-3940256099942544/2934735716';
const GOOGLE_TEST_IOS_INTERSTITIAL = 'ca-app-pub-3940256099942544/4411468910';

module.exports = ({ config }) => {
  const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';
  const androidAppId = isProductionBuild
    ? (process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || '').trim()
    : GOOGLE_TEST_ANDROID_APP_ID;
  const iosAppId = isProductionBuild
    ? (process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || '').trim()
    : GOOGLE_TEST_IOS_APP_ID;

  const plugins = (config.plugins || []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== 'expo-notifications';
  });
  if (androidAppId || iosAppId) {
    plugins.push([
      'react-native-google-mobile-ads',
      {
        ...(androidAppId ? { androidAppId } : {}),
        ...(iosAppId ? { iosAppId } : {}),
      },
    ]);
  }

  return {
    ...config,
    plugins,
    extra: {
      ...(config.extra || {}),
      testerAccountEnabled: !isProductionBuild,
      testerEmail: isProductionBuild
        ? ''
        : process.env.EXPO_PUBLIC_TESTER_EMAIL || 'tester@getstudyflow.in',
      // Preview/development demo password only. Production binaries get an empty value.
      // Override with EXPO_PUBLIC_TESTER_PASSWORD. This is a labeled demo credential, not a production secret.
      testerPassword: isProductionBuild
        ? ''
        : process.env.EXPO_PUBLIC_TESTER_PASSWORD || 'StudyFlow-Tester-Preview',
      // Public client values only. Read from .env / .env.local / EAS env at config
      // evaluation so production web export and native binaries both receive them.
      // Never copy SUPABASE_SERVICE_ROLE_KEY (or any other Edge secret) into extra.
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      easBuildProfile: process.env.EAS_BUILD_PROFILE || '',
      admob: {
        useTestIds: !isProductionBuild,
        androidAppId,
        iosAppId,
        androidBannerUnitId: isProductionBuild
          ? (process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID || '').trim()
          : GOOGLE_TEST_ANDROID_BANNER,
        androidInterstitialUnitId: isProductionBuild
          ? (process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID || '').trim()
          : GOOGLE_TEST_ANDROID_INTERSTITIAL,
        iosBannerUnitId: isProductionBuild
          ? (process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID || '').trim()
          : GOOGLE_TEST_IOS_BANNER,
        iosInterstitialUnitId: isProductionBuild
          ? (process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_UNIT_ID || '').trim()
          : GOOGLE_TEST_IOS_INTERSTITIAL,
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/645e516b-e914-4448-84a6-b52edcc2c849',
      enabled: isProductionBuild,
      checkAutomatically: isProductionBuild ? 'ON_ERROR_RECOVERY' : 'NEVER',
      fallbackToCacheTimeout: 0,
    },
  };
};
