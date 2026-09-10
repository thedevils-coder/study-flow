import { Pricing, ProductId } from '@/types';
import { PRODUCT_IDS } from '@/lib/entitlements';

/** Display defaults only; RevenueCat/store configuration is authoritative. */
export const defaultPricing: Pricing = {
  trialPrice: 0,
  trialDays: 15,
  monthlyPrice: 99,
  yearlyPrice: 1000,
  proMonthlyPrice: 299,
  proYearlyPrice: 2500,
  currency: 'INR',
};

export const money = (amount: number, locale = 'en-IN', currency = 'INR') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

export const proAnnualSaving = defaultPricing.proMonthlyPrice * 12 - defaultPricing.proYearlyPrice;

export interface BillingGateway {
  startCheckout(productId: ProductId | 'monthly'): Promise<void>;
  restore(): Promise<void>;
  manageSubscription(): Promise<void>;
}

export const billing: BillingGateway = {
  async startCheckout(productId) {
    const { purchaseProduct } = await import('@/services/subscriptions');
    const id: ProductId = productId === 'monthly' ? PRODUCT_IDS.basicMonthly : productId;
    await purchaseProduct(id);
  },
  async restore() {
    const { restorePurchases } = await import('@/services/subscriptions');
    await restorePurchases();
  },
  async manageSubscription() {
    throw new Error(
      'Open the Apple App Store or Google Play subscription settings to manage your mobile subscription.',
    );
  },
};
