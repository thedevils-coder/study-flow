import { Platform } from 'react-native';
import mobileAds, { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';

let interstitial: InterstitialAd | null = null;
let loaded = false;
let loading = false;
let loadedUnitId = '';

export function nativeAdsSupported() {
  return Platform.OS !== 'web';
}

export async function initializeNativeAds() {
  try {
    await mobileAds().initialize();
    return true;
  } catch {
    return false;
  }
}

function ensureInterstitial(unitId: string) {
  if (!unitId) return null;
  if (interstitial && loadedUnitId === unitId) return interstitial;

  loaded = false;
  loading = false;
  loadedUnitId = unitId;
  interstitial = InterstitialAd.createForAdRequest(unitId);
  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true;
    loading = false;
  });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    loaded = false;
    loading = false;
    preloadNativeInterstitial(unitId);
  });
  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    loaded = false;
    loading = false;
  });
  return interstitial;
}

export function preloadNativeInterstitial(unitId: string) {
  const ad = ensureInterstitial(unitId);
  if (!ad || loaded || loading) return;
  try {
    loading = true;
    ad.load();
  } catch {
    loading = false;
  }
}

export async function showNativeInterstitial(unitId: string) {
  if (!unitId) return false;
  const ad = ensureInterstitial(unitId);
  if (!ad) return false;

  if (!loaded) {
    preloadNativeInterstitial(unitId);
    return false;
  }

  try {
    await ad.show();
    loaded = false;
    return true;
  } catch {
    loaded = false;
    preloadNativeInterstitial(unitId);
    return false;
  }
}
