import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { defaultPricing, money, billing, proAnnualSaving } from '@/services/pricing';
import { trialTiming } from '@/services/trial';
import { PRODUCT_IDS } from '@/lib/entitlements';
import { getOffering } from '@/services/subscriptions';
import { ProductId } from '@/types';

export default function Subscription() {
  const { session, refreshSubscription } = useApp();
  const tr = (key: string) => t(session!.language, key);
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
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text onPress={() => router.back()} style={styles.back}>
          {tr('back')}
        </Text>
        <Text style={styles.title}>{tr('subscription')}</Text>
        <Text style={styles.sub}>{tr('subscriptionIntro')}</Text>
        <Card>
          <Text style={styles.label}>{tr('currentStatus')}</Text>
          <Text style={styles.current}>
            {session!.plan === 'none' ? tr('noPlan') : tr(session!.plan === 'monthly' ? 'basic' : session!.plan)}
          </Text>
          <Text style={styles.sub}>
            {tr('status')}: {session!.subscriptionStatus}
          </Text>
          {timing ? (
            <Text style={styles.sub}>
              {tr('trialEndsOn')} {timing.endDate.toLocaleDateString(session!.language)} · {timing.daysRemaining}{' '}
              {tr('daysRemaining')}
            </Text>
          ) : null}
        </Card>
        <Card style={styles.plan}>
          <Text style={styles.badge}>{tr('freeTrial').toUpperCase()}</Text>
          <Text style={styles.price}>{tr('free')}</Text>
          <Text style={styles.sub}>{tr('freeTrialDescription')}</Text>
          <Text style={styles.sub}>{tr('billingBegins')}</Text>
          <Button label={tr('startFreeTrial')} onPress={() => buy(PRODUCT_IDS.basicMonthly)} />
        </Card>
        <Card style={styles.plan}>
          <Text style={styles.badge}>{tr('basic').toUpperCase()}</Text>
          <Text style={styles.price}>
            {price(PRODUCT_IDS.basicMonthly, money(pricing.monthlyPrice))}
            <Text style={styles.unit}>/ {tr('monthly')}</Text>
          </Text>
          <Text style={styles.sub}>{tr('basicIncludes')}</Text>
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
            <Text style={styles.badge}>{tr('pro').toUpperCase()}</Text>
            <Text style={styles.bestText}>{tr('bestValue')}</Text>
          </View>
          <Text style={styles.price}>
            {price(PRODUCT_IDS.proMonthly, money(pricing.proMonthlyPrice))}
            <Text style={styles.unit}>/ {tr('monthly')}</Text>
          </Text>
          <Text style={styles.sub}>{tr('proIncludes')}</Text>
          <Text style={styles.sub}>
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
        <Text style={styles.legal}>{tr('paymentVerification')}</Text>
        <Text style={styles.legal}>{tr('localizedPriceNote')}</Text>
        <Text style={styles.legal}>{tr('cancelAnytime')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: 'white' },
  scroll: { padding: 20, paddingBottom: 40, gap: 10 },
  back: { color: colors.purple, fontWeight: '800', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink, marginTop: 8 },
  sub: { color: colors.muted, lineHeight: 20, marginTop: 5 },
  label: { fontSize: 11, fontWeight: '900', letterSpacing: 1, color: colors.purple },
  current: { fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 5 },
  plan: { gap: 10 },
  badge: { color: colors.purple, fontWeight: '900', fontSize: 12 },
  price: { fontSize: 29, fontWeight: '900', color: colors.ink },
  unit: { fontSize: 14, fontWeight: '600', color: colors.muted },
  legal: { fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
  best: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bestText: {
    backgroundColor: colors.gold,
    color: colors.ink,
    fontWeight: '900',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
