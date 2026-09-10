import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ThemedSafeArea } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { defaultPricing, money } from '@/services/pricing';
import { t } from '@/i18n';
import { useColors } from '@/lib/use-colors';

export default function Admin() {
  const { session } = useApp();
  const palette = useColors();
  const p = defaultPricing;
  const tr = (key: string) => t(session?.language || 'en', key);

  if (session?.role !== 'admin') {
    router.replace('/(tabs)');
    return null;
  }

  return (
    <ThemedSafeArea>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.title, { color: palette.ink }]}>{tr('admin')}</Text>
        <Text style={[s.sub, { color: palette.muted }]}>{tr('adminDataNotice')}</Text>
        <View style={s.grid}>
          {[tr('users'), tr('trialUsers'), tr('basic'), tr('pro')].map((label) => (
            <Card key={label} style={s.metric}>
              <Text style={[s.sub, { color: palette.muted }]}>{label}</Text>
              <Text style={[s.num, { color: palette.ink }]}>{tr('unavailable')}</Text>
            </Card>
          ))}
        </View>
        <Card>
          <Text style={[s.heading, { color: palette.ink }]}>{tr('revenue')}</Text>
          <Text style={[s.sub, { color: palette.muted }]}>{tr('revenueNotice')}</Text>
          <Text style={[s.sub, { color: palette.muted }]}>
            {tr('estimated')}: {tr('unavailable')}
          </Text>
        </Card>
        <Card>
          <Text style={[s.heading, { color: palette.ink }]}>{tr('pricing')}</Text>
          <Text style={[s.sub, { color: palette.muted }]}>{tr('pricingNotice')}</Text>
          <Text style={[s.sub, { color: palette.muted }]}>
            {tr('freeTrial')}: {p.trialDays} {tr('days')}
          </Text>
          <Text style={[s.sub, { color: palette.muted }]}>
            {tr('basic')}: {money(p.monthlyPrice)} / {money(p.yearlyPrice)}
          </Text>
          <Text style={[s.sub, { color: palette.muted }]}>
            {tr('pro')}: {money(p.proMonthlyPrice)} / {money(p.proYearlyPrice)}
          </Text>
        </Card>
      </ScrollView>
    </ThemedSafeArea>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 27, fontWeight: '900' },
  sub: { lineHeight: 19, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 },
  metric: { width: '47%', marginBottom: 0 },
  num: { fontSize: 18, fontWeight: '900', marginTop: 5 },
  heading: { fontSize: 18, fontWeight: '900', marginBottom: 5 },
});
