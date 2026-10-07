import React, { useEffect } from 'react';

import { configureAds } from '@/lib/ads';
import { useAuth } from '@/providers/auth-provider';

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const { session, tier } = useAuth();

  useEffect(() => {
    void configureAds(session, tier);
  }, [session, tier]);

  return <>{children}</>;
}
