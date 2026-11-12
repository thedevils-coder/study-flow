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

module.exports = ({ config }) => {
  const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';
  const androidAppId =
    isProductionBuild && process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID
      ? process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID
      : GOOGLE_TEST_ANDROID_APP_ID;
  const iosAppId =
    isProductionBuild && process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID
      ? process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID
      : GOOGLE_TEST_IOS_APP_ID;

  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      testerAccountEnabled: false,
      testerEmail: '',
      testerPassword: '',
    },
    plugins: [
      ...(config.plugins || []),
      [
        'react-native-google-mobile-ads',
        {
          androidAppId,
          iosAppId,
        },
      ],
    ],
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
