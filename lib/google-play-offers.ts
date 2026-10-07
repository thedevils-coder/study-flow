import { isPlayBasePlanId, type PlayBasePlanId } from '@/lib/google-play-products';
import { isTrialOffer, isTrialPricingPhases } from '@/lib/google-play-trial';

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
  return isTrialPricingPhases(details.pricingPhases?.pricingPhaseList);
}

function offerIsTrial(offer: PlaySubscriptionOfferLike) {
  return isTrialOffer(offer);
}

/**
 * Pick the Play offer token for a selected base plan from expo-iap product data.
 * Prefers the paid base-plan offer (no offerId) and skips free-trial offers.
 */
export function offerTokenForBasePlan(
  product: PlaySubscriptionLike | null | undefined,
  basePlanId: string | null | undefined,
): string | null {
  if (!product || !isPlayBasePlanId(basePlanId)) return null;

  const details = detailsForBasePlan(product, basePlanId);
  const paidDetails =
    details.find((item) => isBlankOfferId(item.offerId) && !detailsAreTrial(item)) ??
    details.find((item) => !detailsAreTrial(item));
  if (paidDetails?.offerToken) return paidDetails.offerToken;

  const offers = offersForBasePlan(product, basePlanId);
  const paidOffer =
    offers.find((item) => isBlankOfferId(item.id) && !offerIsTrial(item)) ??
    offers.find((item) => !offerIsTrial(item));
  return paidOffer?.offerTokenAndroid ?? null;
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

export function hasBasePlanOffers(
  product: PlaySubscriptionLike | null | undefined,
  basePlanId: string | null | undefined,
) {
  if (!product || !isPlayBasePlanId(basePlanId)) return false;
  return detailsForBasePlan(product, basePlanId).length > 0 || offersForBasePlan(product, basePlanId).length > 0;
}
