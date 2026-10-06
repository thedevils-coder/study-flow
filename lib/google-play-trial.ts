import { PRODUCT_IDS } from '@/lib/google-play-products';
import type { ProductId, SubscriptionTier } from '@/types';

/**
 * Trial display data taken from Google Play product/offer payloads.
 * Never invent a duration (including 15 days) when Play did not return one.
 */
export type PlayTrialInfo = {
  trialLabel: string;
  billingPeriod: string | null;
};

type PricingPhaseLike = {
  priceAmountMicros?: string | number | null;
  billingPeriod?: string | null;
  billingCycleCount?: number | null;
};

type OfferLike = {
  paymentMode?: string | null;
  price?: number | null;
  period?: { unit?: string | null; value?: number | null } | null;
  periodCount?: number | null;
  pricingPhasesAndroid?: { pricingPhaseList?: PricingPhaseLike[] | null } | null;
};

type AndroidOfferDetailsLike = {
  pricingPhases?: { pricingPhaseList?: PricingPhaseLike[] | null } | null;
};

export type PlayProductTrialSource = {
  subscriptionOffers?: OfferLike[] | null;
  subscriptionOfferDetailsAndroid?: Array<AndroidOfferDetailsLike | null> | null;
};

const ISO_PERIOD = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/i;

function isZeroPrice(micros: string | number | null | undefined) {
  if (micros == null || micros === '') return false;
  const amount = typeof micros === 'number' ? micros : Number(micros);
  return Number.isFinite(amount) && amount === 0;
}

function parseIsoPeriod(period: string) {
  const match = ISO_PERIOD.exec(period.trim().toUpperCase());
  if (!match) return null;
  const years = Number(match[1] || 0);
  const months = Number(match[2] || 0);
  const weeks = Number(match[3] || 0);
  const days = Number(match[4] || 0);
  if (!years && !months && !weeks && !days) return null;
  return { years, months, weeks, days };
}

function labelFromParts(
  parts: { years: number; months: number; weeks: number; days: number },
  cycleCount: number,
) {
  const years = parts.years * cycleCount;
  const months = parts.months * cycleCount;
  const weeks = parts.weeks * cycleCount;
  const days = parts.days * cycleCount;
  const chunks: string[] = [];
  if (years) chunks.push(`${years}-year`);
  if (months) chunks.push(`${months}-month`);
  if (weeks) chunks.push(`${weeks}-week`);
  if (days) chunks.push(`${days}-day`);
  return chunks.length ? `${chunks.join(' ')} free trial` : null;
}

function labelFromUnit(unit: string, value: number, periodCount: number) {
  const count = value * periodCount;
  if (!Number.isFinite(count) || count <= 0) return null;
  switch (unit.trim().toLowerCase()) {
    case 'day':
    case 'days':
      return `${count}-day free trial`;
    case 'week':
    case 'weeks':
      return `${count}-week free trial`;
    case 'month':
    case 'months':
      return `${count}-month free trial`;
    case 'year':
    case 'years':
      return `${count}-year free trial`;
    default:
      return null;
  }
}

export function trialLabelFromIsoPeriod(period: string, cycleCount = 1): string | null {
  const parsed = parseIsoPeriod(period);
  if (!parsed) return null;
  const cycles = cycleCount > 0 ? cycleCount : 1;
  return labelFromParts(parsed, cycles);
}

export function trialFromPricingPhases(
  phases: PricingPhaseLike[] | null | undefined,
): PlayTrialInfo | null {
  if (!phases?.length) return null;
  for (const phase of phases) {
    if (!isZeroPrice(phase.priceAmountMicros)) continue;
    const period = phase.billingPeriod?.trim() || '';
    if (!period) continue;
    const cycles = phase.billingCycleCount && phase.billingCycleCount > 0 ? phase.billingCycleCount : 1;
    const trialLabel = trialLabelFromIsoPeriod(period, cycles);
    if (!trialLabel) continue;
    return { trialLabel, billingPeriod: period };
  }
  return null;
}

export function trialFromOffer(offer: OfferLike | null | undefined): PlayTrialInfo | null {
  if (!offer) return null;

  const fromPhases = trialFromPricingPhases(offer.pricingPhasesAndroid?.pricingPhaseList);
  if (fromPhases) return fromPhases;

  const mode = String(offer.paymentMode || '').toLowerCase();
  if (mode !== 'free-trial') return null;

  const unit = offer.period?.unit;
  const value = offer.period?.value;
  if (unit && typeof value === 'number') {
    const trialLabel = labelFromUnit(unit, value, offer.periodCount && offer.periodCount > 0 ? offer.periodCount : 1);
    if (trialLabel) return { trialLabel, billingPeriod: null };
  }

  return { trialLabel: 'Free trial available from Google Play', billingPeriod: null };
}

export function trialFromPlayProduct(product: PlayProductTrialSource | null | undefined): PlayTrialInfo | null {
  if (!product) return null;

  for (const offer of product.subscriptionOffers ?? []) {
    const trial = trialFromOffer(offer);
    if (trial) return trial;
  }

  for (const details of product.subscriptionOfferDetailsAndroid ?? []) {
    const trial = trialFromPricingPhases(details?.pricingPhases?.pricingPhaseList);
    if (trial) return trial;
  }

  return null;
}

export function preferredPlayTrialProduct<T extends { productId: ProductId; trialLabel?: string | null }>(
  products: T[],
): T | null {
  const withTrial = products.filter((product) => Boolean(product.trialLabel));
  if (!withTrial.length) return null;
  const order: ProductId[] = [
    PRODUCT_IDS.proYearly,
    PRODUCT_IDS.proMonthly,
    PRODUCT_IDS.basicYearly,
    PRODUCT_IDS.basicMonthly,
  ];
  for (const productId of order) {
    const match = withTrial.find((product) => product.productId === productId);
    if (match) return match;
  }
  return withTrial[0];
}

export function playBillingIntroCopy() {
  return 'Android subscriptions use Google Play Billing. Google Play is the source of truth for prices and trial eligibility.';
}

export function playTrialIntroCopy(trialLabel: string | null | undefined) {
  if (!trialLabel) return null;
  return `${trialLabel}. Shown because Google Play returned an eligible trial offer for this account.`;
}

export function localFreeEntitlementNote(tier: SubscriptionTier) {
  if (tier !== 'free') return null;
  return 'Free is the default local access state when no verified Google Play entitlement is stored. Status none means there is no local subscription row yet — it does not mean a Google Play trial is unavailable.';
}
