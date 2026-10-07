import { bannerAdUnitId, interstitialAdUnitId, useTestAdIds } from '@/lib/ad-config';
import {
  beginInterstitialAttempt,
  canShowInterstitial,
  finishInterstitialAttempt,
  type InterstitialReason,
} from '@/lib/ad-policy';
import {
  initializeNativeAds,
  nativeAdsSupported,
  preloadNativeInterstitial,
  showNativeInterstitial,
} from '@/lib/ads-runtime';
import { shouldShowAds } from '@/lib/plans';
import type { SubscriptionTier, UserSession } from '@/types';

export { INTERSTITIAL_COOLDOWN_MS, canShowInterstitial } from '@/lib/ad-policy';
export { bannerAdUnitId, interstitialAdUnitId, useTestAdIds } from '@/lib/ad-config';
export { shouldShowAds };

let initializedForUser: string | null = null;

export function adsAllowed(session: UserSession | null | undefined, tier: SubscriptionTier) {
  return shouldShowAds(session, tier) && nativeAdsSupported();
}

export async function configureAds(session: UserSession | null | undefined, tier: SubscriptionTier) {
  if (!adsAllowed(session, tier) || !session) {
    initializedForUser = null;
    return;
  }
  if (initializedForUser === session.id) return;
  const ready = await initializeNativeAds();
  if (ready) {
    initializedForUser = session.id;
    preloadNativeInterstitial(interstitialAdUnitId());
  }
}

export async function showInterstitialAd(input: {
  session: UserSession | null | undefined;
  tier: SubscriptionTier;
  reason: InterstitialReason;
  token?: string;
}) {
  if (!adsAllowed(input.session, input.tier)) return false;
  if (!canShowInterstitial({ adsEnabled: true, reason: input.reason, token: input.token })) {
    return false;
  }

  beginInterstitialAttempt(input.reason, input.token);
  try {
    const unitId = interstitialAdUnitId();
    if (!unitId) {
      finishInterstitialAttempt(false);
      return false;
    }
    const shown = await showNativeInterstitial(unitId);
    finishInterstitialAttempt(shown);
    return shown;
  } catch {
    finishInterstitialAttempt(false);
    return false;
  }
}
