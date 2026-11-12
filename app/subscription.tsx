import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { displayPlanLabel, PRODUCT_IDS } from '@/lib/entitlements';
import { PLAN_CONFIG } from '@/lib/plans';
import { userFacingError } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { defaultPricing, money, proAnnualDiscount, proAnnualSaving } from '@/services/pricing';
import { paypalPayments } from '@/services/payments/paypal';
import { razorpayPayments } from '@/services/payments/razorpay';
import { isPurchasesReady } from '@/services/subscriptions';

export default function Subscription() {
  const { session, tier, purchase, restore } = useAuth();
  const { colors } = useTheme();

  const buy = async (productId: (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS]) => {
    try {
      await purchase(productId);
    } catch (error) {
      Alert.alert('Subscription', userFacingError(error, 'Purchase did not complete.'));
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Subscription" back />
      <Text style={{ color: colors.secondaryText, marginBottom: 16, lineHeight: 22 }}>
        Basic is free forever. Pro is the paid plan. Android subscriptions use Google Play Billing. Store prices are the source of truth.
      </Text>
      <Card>
        <Text style={[styles.label, { color: colors.accent }]}>CURRENT PLAN</Text>
        <Text style={[styles.price, { color: colors.text }]}>{displayPlanLabel(tier)}</Text>
        <Text style={{ color: colors.secondaryText, marginTop: 4 }}>Status: {session?.subscriptionStatus ?? 'none'}</Text>
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.accent }]}>BASIC</Text>
        <Text style={[styles.price, { color: colors.text }]}>FREE</Text>
        <Text style={{ color: colors.secondaryText }}>{money(PLAN_CONFIG.basic.price)} forever. Ads included.</Text>
        <Text style={[styles.copy, { color: colors.secondaryText }]}>
          {PLAN_CONFIG.basic.aiGenerationsPerDay} AI generations/day including Leo, ads, tasks, planner, basic Focus, basic Progress, goals, streaks, and basic AI Meter.
        </Text>
      </Card>

      <Card>
        <View style={styles.best}><Text style={styles.bestText}>BEST VALUE</Text></View>
        <Text style={[styles.label, { color: colors.accent }]}>PRO</Text>
        <Text style={[styles.price, { color: colors.text }]}>
          {money(defaultPricing.proMonthly)}
          <Text style={[styles.unit, { color: colors.mutedText }]}>/month</Text>
        </Text>
        <Text style={{ color: colors.secondaryText }}>
          Yearly {money(defaultPricing.proYearly)} · save {money(proAnnualSaving)} (~{proAnnualDiscount}%)
        </Text>
        <Text style={[styles.copy, { color: colors.secondaryText }]}>
          {PLAN_CONFIG.pro.aiGenerationsPerDay} AI generations/day, no ads, full AI Meter, Leo, Schedule Maker, advanced analytics, Study Shield where supported, and future smart study features.
        </Text>
        <Button label="Choose Pro monthly" onPress={() => void buy(PRODUCT_IDS.proMonthly)} style={{ marginTop: 12 }} />
        <Button label="Choose Pro yearly" variant="secondary" onPress={() => void buy(PRODUCT_IDS.proYearly)} style={{ marginTop: 8 }} />
      </Card>

      <Button
        label="Restore purchases"
        variant="ghost"
        onPress={async () => {
          try {
            await restore();
            Alert.alert('Restore', 'Your store purchases were refreshed.');
          } catch (error) {
            Alert.alert('Restore', userFacingError(error, 'Restore did not complete.'));
          }
        }}
      />

      {!isPurchasesReady() ? (
        <Text style={[styles.note, { color: colors.warning }]}>
          Purchases need an EAS Android build with Google Play Billing. This screen will not fake a successful purchase.
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
