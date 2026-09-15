/**
 * Razorpay is reserved for supported external / web flows.
 * Do not collect card numbers, CVV, UPI PIN, or bank passwords in the app.
 * Do not use Razorpay to bypass Google Play billing.
 */
export const razorpayPayments = {
  enabled: false,
  reason:
    'Razorpay is not used for Google Play digital subscriptions. It can be enabled later for supported web flows only.',
};
