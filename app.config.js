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
module.exports = ({ config }) => {
  const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';

  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      testerAccountEnabled: !isProductionBuild,
      EXPO_PUBLIC_TESTER_EMAIL: isProductionBuild
        ? ''
        : process.env.EXPO_PUBLIC_TESTER_EMAIL || 'tester@getstudyflow.in',
      // Preview/development demo password only. Production binaries get an empty value.
      // Override with EXPO_PUBLIC_TESTER_PASSWORD. This is a labeled demo credential, not a production secret.
      EXPO_PUBLIC_TESTER_PASSWORD: isProductionBuild
        ? ''
        : process.env.EXPO_PUBLIC_TESTER_PASSWORD || 'StudyFlow-Tester-Preview',
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
