import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { shouldShowAds } from '@/lib/plans';
import type { UserSession } from '@/types';

const GOOGLE_TEST_ANDROID = {
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',
  androidBanner: 'ca-app-pub-3940256099942544/6300978111',
  androidInterstitial: 'ca-app-pub-3940256099942544/1033173712',
} as const;

const root = path.resolve(__dirname, '..');

const PRODUCTION_ANDROID = {
  EXPO_PUBLIC_ADMOB_ANDROID_APP_ID: 'ca-app-pub-9082511343175778~1064883159',
  EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID: 'ca-app-pub-9082511343175778/5692102889',
  EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID: 'ca-app-pub-9082511343175778/9246625500',
} as const;

function evaluateExpoConfig(env: Record<string, string>) {
  const script = `
    const result = require('./app.config.js')({ config: { extra: {}, plugins: [] } });
    process.stdout.write(JSON.stringify({ extra: result.extra, plugins: result.plugins }));
  `;
  return JSON.parse(
    execFileSync(process.execPath, ['-e', script], {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: 'utf8',
    }),
  ) as {
    extra: {
      easBuildProfile?: string;
      admob?: {
        useTestIds?: boolean;
        androidAppId?: string;
        androidBannerUnitId?: string;
        androidInterstitialUnitId?: string;
      };
    };
    plugins: Array<string | [string, Record<string, string>]>;
  };
}

function admobPlugin(plugins: Array<string | [string, Record<string, string>]>) {
  return plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads') as
    | [string, Record<string, string>]
    | undefined;
}

const session = (overrides: Partial<UserSession> = {}): UserSession => ({
  id: 'user',
  email: 'a@b.c',
  name: 'Student',
  role: 'user',
  plan: 'basic',
  subscriptionStatus: 'none',
  entitlements: [],
  ...overrides,
});

describe('production Android AdMob environment', () => {
  it('keeps the three production Android IDs on the EAS production profile only', () => {
    const eas = JSON.parse(readFileSync(path.join(root, 'eas.json'), 'utf8')) as {
      build: Record<string, { env?: Record<string, string> }>;
    };
    expect(eas.build.production.env).toEqual(PRODUCTION_ANDROID);
    expect(eas.build.development?.env?.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID).toBeUndefined();
    expect(eas.build.preview?.env?.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID).toBeUndefined();

    const source = readFileSync(path.join(root, 'app.config.js'), 'utf8');
    expect(source).not.toMatch(/ca-app-pub-9082511343175778/);
  });

  it('reads all three production Android values when EAS_BUILD_PROFILE is production', () => {
    const result = evaluateExpoConfig({
      EAS_BUILD_PROFILE: 'production',
      ...PRODUCTION_ANDROID,
    });
    expect(result.extra.admob).toMatchObject({
      useTestIds: false,
      androidAppId: PRODUCTION_ANDROID.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
      androidBannerUnitId: PRODUCTION_ANDROID.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID,
      androidInterstitialUnitId: PRODUCTION_ANDROID.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID,
    });
    expect(result.extra.admob?.androidAppId).not.toBe(GOOGLE_TEST_ANDROID.androidAppId);
    expect(result.extra.admob?.androidBannerUnitId).not.toBe(GOOGLE_TEST_ANDROID.androidBanner);
    expect(result.extra.admob?.androidInterstitialUnitId).not.toBe(GOOGLE_TEST_ANDROID.androidInterstitial);

    const plugin = admobPlugin(result.plugins);
    expect(plugin?.[1].androidAppId).toBe(PRODUCTION_ANDROID.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID);
    expect(plugin?.[1].androidAppId).not.toBe(GOOGLE_TEST_ANDROID.androidAppId);
  });

  it('keeps Google test IDs for development and preview even if production values are present', () => {
    for (const profile of ['development', 'preview', '']) {
      const result = evaluateExpoConfig({
        EAS_BUILD_PROFILE: profile,
        ...PRODUCTION_ANDROID,
      });
      expect(result.extra.admob).toMatchObject({
        useTestIds: true,
        androidAppId: GOOGLE_TEST_ANDROID.androidAppId,
        androidBannerUnitId: GOOGLE_TEST_ANDROID.androidBanner,
        androidInterstitialUnitId: GOOGLE_TEST_ANDROID.androidInterstitial,
      });
      const plugin = admobPlugin(result.plugins);
      expect(plugin?.[1].androidAppId).toBe(GOOGLE_TEST_ANDROID.androidAppId);
    }
  });

  it('enables banner and interstitial ads for Basic and never for Pro', () => {
    expect(shouldShowAds(session(), 'basic')).toBe(true);
    expect(shouldShowAds(session({ plan: 'pro', subscriptionStatus: 'active', entitlements: ['pro'] }), 'pro')).toBe(
      false,
    );
    expect(shouldShowAds(null, 'basic')).toBe(false);
  });
});
