import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { bannerAdUnitId } from '@/lib/ad-config';
import { useAds } from '@/providers/ads-provider';

export function BannerAdSlot() {
  const { adsEnabled } = useAds();
  const [failed, setFailed] = useState(false);

  if (!adsEnabled || failed || Platform.OS === 'web') return null;

  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={bannerAdUnitId(Platform.OS)}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 12, minHeight: 50 },
});
