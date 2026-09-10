import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Card } from '@/components/ui';
import { BRAND } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { useColors } from '@/lib/use-colors';
import { ThemedSafeArea } from '@/components/ui';

export default function Legal() {
  const { session } = useApp();
  const tr = (key: string) => t(session?.language || 'en', key);
  const palette = useColors();

  return (
    <ThemedSafeArea>
      <ScrollView contentContainerStyle={s.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={[s.back, { color: palette.purple }]}>{tr('back')}</Text>
        </Pressable>
        <Text style={[s.title, { color: palette.ink }]}>{tr('legal')}</Text>
        <Card>
          <Text style={[s.heading, { color: palette.ink }]}>{tr('privacyPolicy')}</Text>
          <Text style={[s.body, { color: palette.ink }]}>{tr('legalPrivacyBody')}</Text>
        </Card>
        <Card>
          <Text style={[s.heading, { color: palette.ink }]}>{tr('terms')}</Text>
          <Text style={[s.body, { color: palette.ink }]}>{tr('legalTermsBody')}</Text>
        </Card>
        <Card>
          <Text style={[s.heading, { color: palette.ink }]}>{tr('subscriptionTerms')}</Text>
          <Text style={[s.body, { color: palette.ink }]}>{tr('legalSubscriptionBody')}</Text>
        </Card>
        <Card>
          <Text style={[s.heading, { color: palette.ink }]}>{tr('accountDeletionInfo')}</Text>
          <Text style={[s.body, { color: palette.ink }]}>{tr('legalDeletionBody')}</Text>
        </Card>
        <Text style={[s.link, { color: palette.purple }]} onPress={() => Linking.openURL(`mailto:${BRAND.supportEmail}`)}>
          {tr('support')}: {BRAND.supportEmail}
        </Text>
      </ScrollView>
    </ThemedSafeArea>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  back: { fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '900', marginVertical: 12 },
  heading: { fontWeight: '900', fontSize: 18, marginBottom: 8 },
  body: { lineHeight: 22 },
  link: { fontWeight: '800', marginTop: 8 },
});
