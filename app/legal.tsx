import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui';
import { BRAND, colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';

export default function Legal() {
  const { session } = useApp();
  const tr = (key: string) => t(session?.language || 'en', key);

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.back}>{tr('back')}</Text>
        </Pressable>
        <Text style={s.title}>{tr('legal')}</Text>
        <Card>
          <Text style={s.heading}>{tr('privacyPolicy')}</Text>
          <Text style={s.body}>
            Study Flow stores your account, tasks, goals, focus sessions, settings and AI prompts so the app can
            function. Data is held in Supabase with row-level security. AI prompts are sent through a server path
            to a configured provider and do not include passwords, payment details or API keys. We do not sell
            personal data. Website: {BRAND.website}
          </Text>
        </Card>
        <Card>
          <Text style={s.heading}>{tr('terms')}</Text>
          <Text style={s.body}>
            Study Flow is a study planner with optional AI tools. AI output can be wrong. You are responsible for
            how you use generated study material. The app is provided as-is for personal study use.
          </Text>
        </Card>
        <Card>
          <Text style={s.heading}>{tr('subscriptionTerms')}</Text>
          <Text style={s.body}>
            A 15-day free trial is offered through Apple App Store or Google Play via RevenueCat. After the trial,
            Basic is displayed as ₹99/month or ₹1,000/year and Pro as ₹299/month or ₹2,500/year. The store price
            in your local currency is the amount billed. Subscriptions renew until cancelled in Apple or Google
            account settings. Study Flow never collects cards, UPI or bank details.
          </Text>
        </Card>
        <Card>
          <Text style={s.heading}>{tr('accountDeletionInfo')}</Text>
          <Text style={s.body}>
            Use Settings → Delete account to permanently delete your user, tasks, focus sessions, goals, settings
            and AI history. Profile rows cascade when the auth user is deleted.
          </Text>
        </Card>
        <Text style={s.link} onPress={() => Linking.openURL(`mailto:${BRAND.supportEmail}`)}>
          {tr('support')}: {BRAND.supportEmail}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: 20, paddingBottom: 40 },
  back: { color: colors.purple, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink, marginVertical: 12 },
  heading: { fontWeight: '900', fontSize: 18, color: colors.ink, marginBottom: 8 },
  body: { color: colors.ink, lineHeight: 22 },
  link: { color: colors.purple, fontWeight: '800', marginTop: 8 },
});
