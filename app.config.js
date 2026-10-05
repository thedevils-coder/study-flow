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
