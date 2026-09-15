import { Image } from 'react-native';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { BRAND } from '@/constants/brand';
import { useTheme } from '@/providers/theme-provider';

export default function Welcome() {
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={styles.hero}>
        <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
        <Text style={[styles.brand, { color: colors.text }]}>{BRAND.wordmark}</Text>
        <Text style={[styles.tag, { color: colors.accent }]}>{BRAND.tagline}</Text>
        <Text style={[styles.title, { color: colors.text }]}>Plan, focus, and achieve your goals.</Text>
        <Text style={[styles.sub, { color: colors.secondaryText }]}>
          A calm study companion with real tasks, a focus timer, Progress, Leo, and AI Meter.
        </Text>
      </View>
      <Button label="Create account" onPress={() => router.push('/(auth)/sign-up')} />
      <View style={{ height: 12 }} />
      <Button label="Sign in" variant="secondary" onPress={() => router.push('/(auth)/sign-in')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 48, paddingBottom: 36 },
  logo: { width: 96, height: 96, borderRadius: 28, marginBottom: 18 },
  brand: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  tag: { marginTop: 10, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textAlign: 'center' },
  title: { marginTop: 28, fontSize: 30, fontWeight: '900', textAlign: 'center', lineHeight: 36 },
  sub: { marginTop: 12, fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
