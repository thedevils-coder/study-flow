import { isPlayBasePlanId, type PlayBasePlanId } from '@/lib/google-play-products';
import { trialFromOffer, trialFromPricingPhases } from '@/lib/google-play-trial';

type PricingPhaseLike = {
  priceAmountMicros?: string | number | null;
  billingPeriod?: string | null;
  billingCycleCount?: number | null;
  formattedPrice?: string | null;
};

export type PlayOfferDetailsLike = {
  basePlanId?: string | null;
  offerId?: string | null;
  offerToken?: string | null;
  pricingPhases?: { pricingPhaseList?: PricingPhaseLike[] | null } | null;
};

export type PlaySubscriptionOfferLike = {
  basePlanIdAndroid?: string | null;
  id?: string | null;
  offerTokenAndroid?: string | null;
  displayPrice?: string | null;
  paymentMode?: string | null;
  period?: { unit?: string | null; value?: number | null } | null;
  periodCount?: number | null;
  price?: number | null;
  pricingPhasesAndroid?: { pricingPhaseList?: PricingPhaseLike[] | null } | null;
};

export type PlaySubscriptionLike = {
  id?: string | null;
  displayPrice?: string | null;
  subscriptionOfferDetailsAndroid?: PlayOfferDetailsLike[] | null;
  subscriptionOffers?: PlaySubscriptionOfferLike[] | null;
};

function isBlankOfferId(offerId: string | null | undefined) {
  return !offerId || offerId === 'null' || offerId === 'undefined';
}

function detailsForBasePlan(product: PlaySubscriptionLike, basePlanId: PlayBasePlanId) {
  return (product.subscriptionOfferDetailsAndroid ?? []).filter(
    (item) => item?.basePlanId === basePlanId && item.offerToken,
  );
}

function offersForBasePlan(product: PlaySubscriptionLike, basePlanId: PlayBasePlanId) {
  return (product.subscriptionOffers ?? []).filter(
    (item) => item?.basePlanIdAndroid === basePlanId && item.offerTokenAndroid,
  );
}

function detailsAreTrial(details: PlayOfferDetailsLike) {
  return Boolean(trialFromPricingPhases(details.pricingPhases?.pricingPhaseList));
}

function offerIsTrial(offer: PlaySubscriptionOfferLike) {
  return Boolean(trialFromOffer(offer));
}

/**
 * Pick the Play offer token for a selected base plan from expo-iap product data.
 * Prefers an eligible free-trial offer when Play actually returned one, then the
 * base-plan offer (no offerId), then any remaining offer for that base plan.
 */
export function offerTokenForBasePlan(
  product: PlaySubscriptionLike | null | undefined,
  basePlanId: string | null | undefined,
): string | null {
  if (!product || !isPlayBasePlanId(basePlanId)) return null;

  const details = detailsForBasePlan(product, basePlanId);
  const trialDetails = details.find(detailsAreTrial);
  if (trialDetails?.offerToken) return trialDetails.offerToken;
  const baseDetails = details.find((item) => isBlankOfferId(item.offerId));
  if (baseDetails?.offerToken) return baseDetails.offerToken;
  if (details[0]?.offerToken) return details[0].offerToken;

  const offers = offersForBasePlan(product, basePlanId);
  const trialOffer = offers.find(offerIsTrial);
  if (trialOffer?.offerTokenAndroid) return trialOffer.offerTokenAndroid;
  const baseOffer = offers.find((item) => isBlankOfferId(item.id));
  if (baseOffer?.offerTokenAndroid) return baseOffer.offerTokenAndroid;
  return offers[0]?.offerTokenAndroid ?? null;
}

export function displayPriceForBasePlan(
  product: PlaySubscriptionLike | null | undefined,
  basePlanId: string | null | undefined,
): string {
  if (!product || !isPlayBasePlanId(basePlanId)) return '';

  const offers = offersForBasePlan(product, basePlanId);
  const paidOffer = offers.find((item) => !offerIsTrial(item) && item.displayPrice) ?? offers.find((item) => item.displayPrice);
  if (paidOffer?.displayPrice) return paidOffer.displayPrice;

  const details = detailsForBasePlan(product, basePlanId);
  for (const item of details) {
    const phases = item.pricingPhases?.pricingPhaseList ?? [];
    const paid = [...phases].reverse().find((phase) => {
      const amount = Number(phase.priceAmountMicros ?? NaN);
      return Number.isFinite(amount) && amount > 0 && phase.formattedPrice;
    });
    if (paid?.formattedPrice) return paid.formattedPrice;
  }

  return product.displayPrice || '';
}

export function trialInfoForBasePlan(
  product: PlaySubscriptionLike | null | undefined,
  basePlanId: string | null | undefined,
) {
  if (!product || !isPlayBasePlanId(basePlanId)) return null;
  for (const offer of offersForBasePlan(product, basePlanId)) {
    const trial = trialFromOffer(offer);
    if (trial) return trial;
  }
  for (const details of detailsForBasePlan(product, basePlanId)) {
    const trial = trialFromPricingPhases(details.pricingPhases?.pricingPhaseList);
    if (trial) return trial;
  }
  return null;
}

export function hasBasePlanOffers(
  product: PlaySubscriptionLike | null | undefined,
  basePlanId: string | null | undefined,
) {
  if (!product || !isPlayBasePlanId(basePlanId)) return false;
  return detailsForBasePlan(product, basePlanId).length > 0 || offersForBasePlan(product, basePlanId).length > 0;
}
