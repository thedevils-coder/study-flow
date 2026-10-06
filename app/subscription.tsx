import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TestStateNotice } from '@/components/TestStateNotice';
import { displayPlanLabel, PRODUCT_IDS } from '@/lib/entitlements';
import { userFacingError } from '@/lib/errors';
import { PLAY_PRODUCT_CATALOG } from '@/lib/google-play-products';
import {
  localFreeEntitlementNote,
  playBillingIntroCopy,
  playTrialIntroCopy,
  preferredPlayTrialProduct,
} from '@/lib/google-play-trial';
import { TESTER_COPY, isTesterBuildEnabled, isTesterSession } from '@/lib/tester';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import {
  basicAnnualDiscount,
  basicAnnualSaving,
  defaultPricing,
  money,
  proAnnualDiscount,
  proAnnualSaving,
} from '@/services/pricing';
import { paypalPayments } from '@/services/payments/paypal';
import { razorpayPayments } from '@/services/payments/razorpay';
import {
  isPurchasesReady,
  listStoreSubscriptionProducts,
  PurchaseCancelledError,
  PurchasePendingError,
  type StoreSubscriptionProduct,
} from '@/services/subscriptions';
import type { ProductId } from '@/types';

export default function Subscription() {
  const { session, tier, purchase, restore } = useAuth();
  const { colors } = useTheme();
  const [storeProducts, setStoreProducts] = useState<StoreSubscriptionProduct[]>([]);

  useEffect(() => {
    if (!isPurchasesReady()) {
      setStoreProducts([]);
      return;
    }
    void listStoreSubscriptionProducts()
      .then(setStoreProducts)
      .catch(() => setStoreProducts([]));
  }, [session?.id]);

  const storeById = useMemo(() => {
    const map = new Map<ProductId, StoreSubscriptionProduct>();
    for (const product of storeProducts) map.set(product.productId, product);
    return map;
  }, [storeProducts]);

  const trialProduct = useMemo(() => preferredPlayTrialProduct(storeProducts), [storeProducts]);
  const trialIntro = playTrialIntroCopy(trialProduct?.trialLabel);
  const freeEntitlementNote = localFreeEntitlementNote(tier);

  const priceLabel = (productId: ProductId, fallbackAmount: number) => {
    const fromStore = storeById.get(productId)?.displayPrice;
    return fromStore || money(fallbackAmount);
  };

  const buy = async (productId: ProductId) => {
    try {
      await purchase(productId);
    } catch (error) {
      if (error instanceof PurchaseCancelledError) {
        Alert.alert('Subscription', 'Purchase cancelled.');
        return;
      }
      if (error instanceof PurchasePendingError) {
        Alert.alert('Subscription', error.message);
        return;
      }
      Alert.alert('Subscription', userFacingError(error, 'Purchase did not complete.'));
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Subscription" back />
      {isTesterBuildEnabled() && isTesterSession(session) ? (
        <TestStateNotice title="Tester / Demo plan" message={TESTER_COPY.subscription} />
      ) : null}
      <Text style={{ color: colors.secondaryText, marginBottom: 16, lineHeight: 22 }}>
        {playBillingIntroCopy()} Store prices are the source of truth when Google Play returns them.
        {trialIntro ? ` ${trialIntro}` : ''}
      </Text>
      <Card>
        <Text style={[styles.label, { color: colors.accent }]}>CURRENT PLAN</Text>
        <Text style={[styles.price, { color: colors.text }]}>{displayPlanLabel(tier)}</Text>
        <Text style={{ color: colors.secondaryText, marginTop: 4 }}>Status: {session?.subscriptionStatus}</Text>
        {freeEntitlementNote ? (
          <Text style={{ color: colors.secondaryText, marginTop: 8, lineHeight: 20 }}>{freeEntitlementNote}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.accent }]}>BASIC</Text>
        <Text style={[styles.price, { color: colors.text }]}>
          {priceLabel(PRODUCT_IDS.basicMonthly, defaultPricing.basicMonthly)}
          <Text style={[styles.unit, { color: colors.mutedText }]}>/month</Text>
        </Text>
        <Text style={{ color: colors.secondaryText }}>
          Yearly {priceLabel(PRODUCT_IDS.basicYearly, defaultPricing.basicYearly)} · save {money(basicAnnualSaving)} (~{basicAnnualDiscount}%)
        </Text>
        <Text style={[styles.copy, { color: colors.secondaryText }]}>
          Tasks, planner, basic Focus, basic Progress, goals, streaks, limited AI Meter, basic Leo, basic Schedule Maker, reminders.
        </Text>
        {storeById.get(PRODUCT_IDS.basicMonthly)?.trialLabel ? (
          <Text style={[styles.copy, { color: colors.secondaryText }]}>
            {storeById.get(PRODUCT_IDS.basicMonthly)?.trialLabel} on Basic monthly, from Google Play.
          </Text>
        ) : null}
        {storeById.get(PRODUCT_IDS.basicYearly)?.trialLabel ? (
          <Text style={[styles.copy, { color: colors.secondaryText }]}>
            {storeById.get(PRODUCT_IDS.basicYearly)?.trialLabel} on Basic yearly, from Google Play.
          </Text>
        ) : null}
        {trialProduct?.entitlement === 'basic' ? (
          <Button label="Start Free Trial" onPress={() => void buy(trialProduct.productId)} style={{ marginTop: 12 }} />
        ) : null}
        <Button label={`Choose ${PLAY_PRODUCT_CATALOG.studyflow_basic_monthly.label}`} onPress={() => void buy(PRODUCT_IDS.basicMonthly)} style={{ marginTop: trialProduct?.entitlement === 'basic' ? 8 : 12 }} />
        <Button label={`Choose ${PLAY_PRODUCT_CATALOG.studyflow_basic_yearly.label}`} variant="secondary" onPress={() => void buy(PRODUCT_IDS.basicYearly)} style={{ marginTop: 8 }} />
      </Card>

      <Card>
        <View style={styles.best}><Text style={styles.bestText}>BEST VALUE</Text></View>
        <Text style={[styles.label, { color: colors.accent }]}>PRO</Text>
        <Text style={[styles.price, { color: colors.text }]}>
          {priceLabel(PRODUCT_IDS.proMonthly, defaultPricing.proMonthly)}
          <Text style={[styles.unit, { color: colors.mutedText }]}>/month</Text>
        </Text>
        <Text style={{ color: colors.secondaryText }}>
          Yearly {priceLabel(PRODUCT_IDS.proYearly, defaultPricing.proYearly)} · save {money(proAnnualSaving)} (~{proAnnualDiscount}%)
        </Text>
        <Text style={[styles.copy, { color: colors.secondaryText }]}>
          Full AI Meter, Leo, Schedule Maker, advanced analytics, Study Shield where supported, and future smart study features.
        </Text>
        {storeById.get(PRODUCT_IDS.proMonthly)?.trialLabel ? (
          <Text style={[styles.copy, { color: colors.secondaryText }]}>
            {storeById.get(PRODUCT_IDS.proMonthly)?.trialLabel} on Pro monthly, from Google Play.
          </Text>
        ) : null}
        {storeById.get(PRODUCT_IDS.proYearly)?.trialLabel ? (
          <Text style={[styles.copy, { color: colors.secondaryText }]}>
            {storeById.get(PRODUCT_IDS.proYearly)?.trialLabel} on Pro yearly, from Google Play.
          </Text>
        ) : null}
        {trialProduct?.entitlement === 'pro' ? (
          <Button label="Start Free Trial" onPress={() => void buy(trialProduct.productId)} style={{ marginTop: 12 }} />
        ) : null}
        <Button label={`Choose ${PLAY_PRODUCT_CATALOG.studyflow_pro_monthly.label}`} variant="secondary" onPress={() => void buy(PRODUCT_IDS.proMonthly)} style={{ marginTop: trialProduct?.entitlement === 'pro' ? 8 : 12 }} />
        <Button label={`Choose ${PLAY_PRODUCT_CATALOG.studyflow_pro_yearly.label}`} variant="secondary" onPress={() => void buy(PRODUCT_IDS.proYearly)} style={{ marginTop: 8 }} />
      </Card>

      <Button
        label="Restore purchases"
        variant="ghost"
        onPress={async () => {
          try {
            await restore();
            Alert.alert('Restore', 'Your Google Play purchases were refreshed.');
          } catch (error) {
            Alert.alert('Restore', userFacingError(error, 'Restore did not complete.'));
          }
        }}
      />

      {!isPurchasesReady() ? (
        <Text style={[styles.note, { color: colors.warning }]}>
          {isTesterBuildEnabled() && isTesterSession(session)
            ? 'TEST STATE: Google Play Billing is not available in this build. You can still browse this screen. Purchases will not complete until you use an EAS Android build and Play products exist.'
            : 'Purchases need an EAS Android build with Google Play Billing. This screen will not fake a successful purchase.'}
        </Text>
      ) : null}

      <Text style={[styles.note, { color: colors.mutedText }]}>
        {paypalPayments.reason} {razorpayPayments.reason}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  price: { fontSize: 28, fontWeight: '900', marginTop: 6 },
  unit: { fontSize: 14, fontWeight: '600' },
  copy: { marginTop: 8, lineHeight: 20 },
  best: { alignSelf: 'flex-start', backgroundColor: '#F5C518', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8 },
  bestText: { fontSize: 11, fontWeight: '900' },
  note: { marginTop: 16, lineHeight: 20, fontSize: 13 },
});
