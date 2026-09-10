import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { defaultPricing, money } from '@/services/pricing';
import { t } from '@/i18n';

export default function Admin() {
  const { session } = useApp();
  if (session?.role !== 'admin') {
    router.replace('/(tabs)');
    return null;
  }
  const p = defaultPricing;
  const tr = (key: string) => t(session.language, key);

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>{tr('admin')}</Text>
        <Text style={s.sub}>{tr('adminDataNotice')}</Text>
        <View style={s.grid}>
          {[tr('users'), tr('trialUsers'), tr('basic'), tr('pro')].map((label) => (
            <Card key={label} style={s.metric}>
              <Text style={s.sub}>{label}</Text>
              <Text style={s.num}>{tr('unavailable')}</Text>
            </Card>
          ))}
        </View>
        <Card>
          <Text style={s.heading}>{tr('revenue')}</Text>
          <Text style={s.sub}>{tr('revenueNotice')}</Text>
          <Text style={s.sub}>{tr('estimated')}: {tr('unavailable')}</Text>
        </Card>
        <Card>
          <Text style={s.heading}>{tr('pricing')}</Text>
          <Text style={s.sub}>{tr('pricingNotice')}</Text>
          <Text style={s.sub}>{tr('freeTrial')}: {p.trialDays} {tr('days')}</Text>
          <Text style={s.sub}>{tr('basic')}: {money(p.monthlyPrice)} / {money(p.yearlyPrice)}</Text>
          <Text style={s.sub}>{tr('pro')}: {money(p.proMonthlyPrice)} / {money(p.proYearlyPrice)}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: 'white' },
  scroll: { padding: 20 },
  title: { fontSize: 27, fontWeight: '900', color: colors.ink },
  sub: { color: colors.muted, lineHeight: 19, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 },
  metric: { width: '47%', marginBottom: 0 },
  num: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 5 },
  heading: { fontSize: 18, fontWeight: '900', color: colors.ink, marginBottom: 5 },
});
