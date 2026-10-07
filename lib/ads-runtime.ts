export async function initializeNativeAds() {
  return false;
}

export async function showNativeInterstitial(_unitId: string) {
  void _unitId;
  return false;
}

export function nativeAdsSupported() {
  return false;
}

export function preloadNativeInterstitial(_unitId: string) {
  void _unitId;
}
