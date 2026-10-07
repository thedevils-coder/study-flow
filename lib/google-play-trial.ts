/**
 * Detects Google Play free-trial offer payloads so Study Flow can skip them.
 * Study Flow does not offer a free trial. These helpers never invent a trial
 * duration and must not be used to start or display a trial.
 */

type PricingPhaseLike = {
  priceAmountMicros?: string | number | null;
  formattedPrice?: string | null;
};

type OfferLike = {
  paymentMode?: string | null;
  pricingPhasesAndroid?: { pricingPhaseList?: PricingPhaseLike[] | null } | null;
};

export function isTrialPricingPhases(phases: PricingPhaseLike[] | null | undefined) {
  if (!phases?.length) return false;
  return phases.some((phase) => {
    const amount = Number(phase.priceAmountMicros ?? NaN);
    const formatted = String(phase.formattedPrice ?? '').trim().toLowerCase();
    return (Number.isFinite(amount) && amount === 0) || formatted === 'free';
  });
}

export function isTrialOffer(offer: OfferLike | null | undefined) {
  if (!offer) return false;
  if (String(offer.paymentMode ?? '').toLowerCase() === 'free-trial') return true;
  return isTrialPricingPhases(offer.pricingPhasesAndroid?.pricingPhaseList);
}

