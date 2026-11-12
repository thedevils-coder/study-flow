import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';

import { AD_INTERSTITIAL_COOLDOWN_MS, interstitialAdUnitId } from '@/lib/ad-config';
import { shouldShowAds } from '@/lib/plans';
import { useAuth } from '@/providers/auth-provider';

type AdsContextValue = {
  adsEnabled: boolean;
  maybeShowInterstitial: () => void;
};

const AdsContext = createContext<AdsContextValue | null>(null);

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const { session, tier } = useAuth();
  const adsEnabled = shouldShowAds(session, tier);
  const lastInterstitial = useRef(0);
  const interstitialRef = useRef<{ show: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!adsEnabled || Platform.OS === 'web') {
      interstitialRef.current = null;
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const ads = await import('react-native-google-mobile-ads');
        try {
          await ads.AdsConsent.requestInfoUpdate();
          await ads.AdsConsent.gatherConsent();
        } catch {
          // Consent form can fail offline; ads still request with whatever status Google returns.
        }
        await ads.default().initialize();
        if (cancelled) return;
        const interstitial = ads.InterstitialAd.createForAdRequest(interstitialAdUnitId(Platform.OS), {
          requestNonPersonalizedAdsOnly: true,
        });
        interstitial.load();
        interstitialRef.current = interstitial;
      } catch {
        interstitialRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      interstitialRef.current = null;
    };
  }, [adsEnabled]);

  const maybeShowInterstitial = useCallback(() => {
    if (!adsEnabled || Platform.OS === 'web') return;
    const now = Date.now();
    if (now - lastInterstitial.current < AD_INTERSTITIAL_COOLDOWN_MS) return;
    const interstitial = interstitialRef.current;
    if (!interstitial) return;
    lastInterstitial.current = now;
    void interstitial.show().catch(() => undefined);
  }, [adsEnabled]);

  const value = useMemo(() => ({ adsEnabled, maybeShowInterstitial }), [adsEnabled, maybeShowInterstitial]);
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds() {
  return useContext(AdsContext) ?? { adsEnabled: false, maybeShowInterstitial: () => undefined };
}
