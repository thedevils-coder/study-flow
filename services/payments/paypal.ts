/**
 * PayPal is reserved for supported external / web flows.
 * Android in-app digital subscriptions must use Google Play Billing via RevenueCat.
 * Never put PayPal client secrets in the mobile app.
 */
export const paypalPayments = {
  enabled: false,
  reason:
    'PayPal is not used for Google Play digital subscriptions. It can be enabled later for supported web flows only.',
};
