import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ThemedSafeArea } from '@/components/ui';
import { useColors } from '@/lib/use-colors';
import { useApp } from '@/store/app-store';
import { t, subscriptionStatusLabel, formatDate } from '@/i18n';
import { defaultPricing, money, billing, proAnnualSaving } from '@/services/pricing';
import { trialTiming } from '@/services/trial';
import { PRODUCT_IDS } from '@/lib/entitlements';
import { getOffering } from '@/services/subscriptions';
import { ProductId } from '@/types';

export default function Subscription() {
  const { session, refreshSubscription } = useApp();
  const tr = (key: string) => t(session!.language, key);
  const palette = useColors();
  const pricing = defaultPricing;
  const [storeLabels, setStoreLabels] = useState<Partial<Record<ProductId, string>>>({});

  useEffect(() => {
    getOffering()
      .then((offering) => {
        if (!offering) {
          return;
        }
        const next: Partial<Record<ProductId, string>> = {};
        for (const pkg of offering.availablePackages) {
          const id = pkg.product.identifier as ProductId;
          next[id] = pkg.product.priceString;
        }
        setStoreLabels(next);
      })
      .catch(() => undefined);
  }, []);

  const buy = async (productId: ProductId) => {
    try {
      await billing.startCheckout(productId);
      await refreshSubscription();
    } catch {
      Alert.alert(tr('subscription'), tr('paymentUnavailable'));
    }
  };

  const restore = async () => {
    try {
      await billing.restore();
      await refreshSubscription();
      Alert.alert(tr('subscription'), tr('restoreSuccess'));
    } catch {
      Alert.alert(tr('subscription'), tr('restoreEmpty'));
    }
  };

  const timing = session!.plan === 'trial' ? trialTiming(session!.trialEndsAt) : null;
  const price = (id: ProductId, fallback: string) => storeLabels[id] || fallback;

  return (
    <ThemedSafeArea>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text onPress={() => router.back()} style={[styles.back, { color: palette.purple }]}>
          {tr('back')}
        </Text>
        <Text style={[styles.title, { color: palette.ink }]}>{tr('subscription')}</Text>
        <Text style={[styles.sub, { color: palette.muted }]}>{tr('subscriptionIntro')}</Text>
        <Card>
          <Text style={[styles.label, { color: palette.purple }]}>{tr('currentStatus')}</Text>
          <Text style={[styles.current, { color: palette.ink }]}>
            {session!.plan === 'none' ? tr('noPlan') : tr(session!.plan === 'monthly' ? 'basic' : session!.plan)}
          </Text>
          <Text style={[styles.sub, { color: palette.muted }]}>
            {tr('status')}: {subscriptionStatusLabel(session!.language, session!.subscriptionStatus)}
          </Text>
          {timing ? (
            <Text style={[styles.sub, { color: palette.muted }]}>
              {tr('trialEndsOn')} {formatDate(session!.language, timing.endDate)} · {timing.daysRemaining}{' '}
              {tr('daysRemaining')}
            </Text>
          ) : null}
        </Card>
        <Card style={styles.plan}>
          <Text style={[styles.badge, { color: palette.purple }]}>{tr('freeTrial').toUpperCase()}</Text>
          <Text style={[styles.price, { color: palette.ink }]}>{tr('free')}</Text>
          <Text style={[styles.sub, { color: palette.muted }]}>{tr('freeTrialDescription')}</Text>
          <Text style={[styles.sub, { color: palette.muted }]}>{tr('billingBegins')}</Text>
          <Button label={tr('startFreeTrial')} onPress={() => buy(PRODUCT_IDS.basicMonthly)} />
        </Card>
        <Card style={styles.plan}>
          <Text style={[styles.badge, { color: palette.purple }]}>{tr('basic').toUpperCase()}</Text>
          <Text style={[styles.price, { color: palette.ink }]}>
            {price(PRODUCT_IDS.basicMonthly, money(pricing.monthlyPrice))}
            <Text style={[styles.unit, { color: palette.muted }]}>/ {tr('monthly')}</Text>
          </Text>
          <Text style={[styles.sub, { color: palette.muted }]}>{tr('basicIncludes')}</Text>
          <Button
            label={`${tr('chooseBasicMonthly')} · ${price(PRODUCT_IDS.basicMonthly, money(pricing.monthlyPrice))}`}
            onPress={() => buy(PRODUCT_IDS.basicMonthly)}
          />
          <Button
            label={`${tr('chooseBasicYearly')} · ${price(PRODUCT_IDS.basicYearly, money(pricing.yearlyPrice))}`}
            variant="light"
            onPress={() => buy(PRODUCT_IDS.basicYearly)}
          />
        </Card>
        <Card style={styles.plan}>
          <View style={styles.best}>
            <Text style={[styles.badge, { color: palette.purple }]}>{tr('pro').toUpperCase()}</Text>
            <Text style={styles.bestText}>{tr('bestValue')}</Text>
          </View>
          <Text style={[styles.price, { color: palette.ink }]}>
            {price(PRODUCT_IDS.proMonthly, money(pricing.proMonthlyPrice))}
            <Text style={[styles.unit, { color: palette.muted }]}>/ {tr('monthly')}</Text>
          </Text>
          <Text style={[styles.sub, { color: palette.muted }]}>{tr('proIncludes')}</Text>
          <Text style={[styles.sub, { color: palette.muted }]}>
            {tr('yearly')}: {price(PRODUCT_IDS.proYearly, money(pricing.proYearlyPrice))} · {tr('saveAmount')}{' '}
            {money(proAnnualSaving)} {tr('comparedToMonthly')}
          </Text>
          <Button
            label={`${tr('chooseProMonthly')} · ${price(PRODUCT_IDS.proMonthly, money(pricing.proMonthlyPrice))}`}
            onPress={() => buy(PRODUCT_IDS.proMonthly)}
          />
          <Button
            label={`${tr('chooseProYearly')} · ${price(PRODUCT_IDS.proYearly, money(pricing.proYearlyPrice))}`}
            variant="light"
            onPress={() => buy(PRODUCT_IDS.proYearly)}
          />
        </Card>
        <Button label={tr('restorePurchases')} variant="light" onPress={restore} />
        <Text style={[styles.legal, { color: palette.muted }]}>{tr('paymentVerification')}</Text>
        <Text style={[styles.legal, { color: palette.muted }]}>{tr('localizedPriceNote')}</Text>
        <Text style={[styles.legal, { color: palette.muted }]}>{tr('cancelAnytime')}</Text>
      </ScrollView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40, gap: 10 },
  back: { fontWeight: '800', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '900', marginTop: 8 },
  sub: { lineHeight: 20, marginTop: 5 },
  label: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  current: { fontSize: 20, fontWeight: '900', marginTop: 5 },
  plan: { gap: 10 },
  badge: { fontWeight: '900', fontSize: 12, color: '#5932E8' },
  price: { fontSize: 29, fontWeight: '900' },
  unit: { fontSize: 14, fontWeight: '600' },
  legal: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  best: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bestText: {
    backgroundColor: '#F5C518',
    color: '#15132A',
    fontWeight: '900',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
