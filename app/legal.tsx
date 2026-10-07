import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BRAND } from '@/constants/brand';
import { useTheme } from '@/providers/theme-provider';

const docs = {
  privacy: {
    title: 'Privacy',
    body: `Study Flow stores your study data in your Supabase account. Tasks, focus sessions, goals, settings and AI history belong to you. We do not sell your study content. Account deletion removes user-owned data and the authentication identity where supported. Official site: ${BRAND.website}`,
  },
  terms: {
    title: 'Terms',
    body: `Study Flow is a student productivity app. Subscriptions for the Android app are sold through Google Play Billing. Prices shown in-app are display defaults; the store price is authoritative. Do not share passwords or payment credentials with anyone claiming to represent Study Flow.`,
  },
  subscription: {
    title: 'Subscription terms',
    body: `Basic is free forever (₹0) with 20 AI generations per day and ads. Pro is ₹299/month or ₹2,500/year with 80 AI generations per day and no ads. Cancel or change Pro in Google Play. Restoring purchases uses the store account on this device.`,
  },
  support: {
    title: 'Support',
    body: `Email ${BRAND.supportEmail} or visit ${BRAND.website}/contact.html. Include the email on your Study Flow account. We never ask for API keys, CVV, UPI PIN, or passwords.`,
  },
} as const;

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const { colors } = useTheme();
  const selected = docs[(doc as keyof typeof docs) || 'privacy'] ?? docs.privacy;

  return (
    <Screen>
      <ScreenHeader title={selected.title} back />
      <Text style={[styles.body, { color: colors.text }]}>{selected.body}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
});
