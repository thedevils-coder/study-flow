import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { bannerAdUnitId } from '@/lib/ad-config';
import { adsAllowed, configureAds } from '@/lib/ads';
import { useAuth } from '@/providers/auth-provider';

export function BannerAdSlot({ placement }: { placement?: string }) {
  const { session, tier } = useAuth();
  const allowed = adsAllowed(session, tier);
  const unitId = bannerAdUnitId();

  useEffect(() => {
    if (allowed) void configureAds(session, tier);
  }, [allowed, session, tier]);

  if (!allowed || !unitId) return null;
  void placement;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    minHeight: 50,
  },
});
