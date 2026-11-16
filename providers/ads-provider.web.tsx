import React, { createContext, useContext, useMemo } from 'react';

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
  const value = useMemo(
    () => ({ adsEnabled, maybeShowInterstitial: () => undefined }),
    [adsEnabled],
  );
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds() {
  return useContext(AdsContext) ?? { adsEnabled: false, maybeShowInterstitial: () => undefined };
}
