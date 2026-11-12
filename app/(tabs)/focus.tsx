import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { formatClock } from '@/lib/dates';
import { hasProAccess } from '@/lib/entitlements';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { focusTimer } from '@/services/focus-timer';
import { detectShieldSupport, shieldService } from '@/services/shield';

export default function Focus() {
  const { tier } = useAuth();
  const { settings } = useStudy();
  const { colors } = useTheme();
  const [state, setState] = useState(focusTimer.getState());
  const shield = detectShieldSupport();

  useEffect(() => {
    if (settings?.focusMinutes) {
      focusTimer.setDuration(settings.focusMinutes * 60);
    }
    return focusTimer.subscribe(setState);
  }, [settings?.focusMinutes]);

  useEffect(() => {
    if (state.running) {
      void shieldService.enableSessionGuards();
    } else {
      void shieldService.disableSessionGuards();
    }
  }, [state.running]);

  const percent = 1 - state.remainingSeconds / Math.max(state.durationSeconds, 1);

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>Focus</Text>
      <Text style={[styles.sub, { color: colors.secondaryText }]}>Default session: 25 minutes. Reset does not save a session.</Text>

      <View style={[styles.ring, { borderColor: colors.accent }]}>
        <Text style={[styles.clock, { color: colors.text }]}>{formatClock(state.remainingSeconds)}</Text>
        <Text style={{ color: colors.mutedText }}>{Math.round(percent * 100)}% complete</Text>
      </View>

      <Button
        label={state.running ? 'Pause' : state.remainingSeconds === 0 ? 'Start again' : 'Start'}
        onPress={() => (state.running ? focusTimer.pause() : focusTimer.start())}
      />
      <Pressable onPress={() => focusTimer.reset()} style={styles.reset}>
        <Text style={{ color: colors.accent, fontWeight: '800' }}>Reset</Text>
      </Pressable>

      <Card>
        <Text style={[styles.heading, { color: colors.text }]}>Study Shield</Text>
        <Text style={[styles.copy, { color: colors.secondaryText }]}>
          {shield.appBlocking
            ? 'App blocking is available on this device.'
            : 'Study Flow cannot block other apps on this device. During a session we keep the screen awake and you can turn on Do Not Disturb yourself.'}
        </Text>
        {hasProAccess(tier) ? (
          <Text style={[styles.copy, { color: colors.success }]}>Keep-awake is on while a session is running.</Text>
        ) : (
          <Pressable onPress={() => router.push('/subscription')}>
            <Text style={{ color: colors.accent, fontWeight: '800', marginTop: 8 }}>
              Unlock Study Shield extras with Pro
            </Text>
          </Pressable>
        )}
        {shield.systemDndHint ? (
          <Button
            label="How to reduce distractions"
            variant="ghost"
            onPress={() =>
              Alert.alert(
                'Study Shield',
                'Turn on Do Not Disturb in Android settings for a quieter session. Full app blocking needs a future native enhancement and is not claimed here.',
              )
            }
            style={{ marginTop: 12 }}
          />
        ) : null}
      </Card>

      <Button label="Focus history" variant="secondary" onPress={() => router.push('/focus-history')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800' },
  sub: { marginTop: 6, marginBottom: 18, lineHeight: 20 },
  ring: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 8,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 28,
  },
  clock: { fontSize: 42, fontWeight: '900' },
  reset: { alignSelf: 'center', marginVertical: 16 },
  heading: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  copy: { lineHeight: 20 },
});
