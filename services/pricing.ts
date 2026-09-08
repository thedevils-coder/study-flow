import { Pricing } from '@/types';
import { purchase } from '@/services/subscriptions';
/** Display defaults only; RevenueCat/store configuration is authoritative for charge timing and final price. */
export const defaultPricing: Pricing = { trialPrice:0, trialDays:15, monthlyPrice:99, currency:'INR' };
export const money = (amount:number, locale='en-IN', currency='INR') => new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:0}).format(amount);
/** Server implementation point: fetch signed, region-aware prices. */
export interface BillingGateway { startCheckout(plan:'monthly'):Promise<void>; manageSubscription():Promise<void> }
export const billing: BillingGateway = { async startCheckout(plan){ await purchase(plan); }, async manageSubscription(){ throw new Error('Open the Apple App Store or Google Play subscription settings to manage your mobile subscription.'); } };
