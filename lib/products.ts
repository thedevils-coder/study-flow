import type { ProductId } from '@/types';

/**
 * Existing Play / RevenueCat product identifiers. Do not rename or delete.
 * Only Pro monthly/yearly are sold. Basic SKUs remain for restore of old purchases.
 */
export const PRODUCT_IDS = {
  basicMonthly: 'studyflow_basic_monthly',
  basicYearly: 'studyflow_basic_yearly',
  proMonthly: 'studyflow_pro_monthly',
  proYearly: 'studyflow_pro_yearly',
} as const satisfies Record<string, ProductId>;

export const PAID_PRODUCT_IDS = [PRODUCT_IDS.proMonthly, PRODUCT_IDS.proYearly] as const;

export function isPaidProductId(productId: string | null | undefined): productId is ProductId {
  return productId === PRODUCT_IDS.proMonthly || productId === PRODUCT_IDS.proYearly;
}
