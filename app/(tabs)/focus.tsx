import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { formatClock } from '@/lib/dates';
import { hasProAccess } from '@/lib/entitlements';
import { userFacingError } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { focusTimer } from '@/services/focus-timer';
import { shieldService } from '@/services/shield';

export default function Focus() {
  const { tier } = useAuth();
  const { settings } = useStudy();
  const { colors } = useTheme();
  const [state, setState] = useState(focusTimer.getState());
  const [keepAwakeOn, setKeepAwakeOn] = useState(false);
  const [dndOn, setDndOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const userHold = useRef(false);
  const shield = shieldService.readState(keepAwakeOn, { dndActive: dndOn });

  useEffect(() => {
    if (settings?.focusMinutes) {
      focusTimer.setDuration(settings.focusMinutes * 60);
    }
    return focusTimer.subscribe(setState);
  }, [settings?.focusMinutes]);

  useEffect(() => {
    let live = true;
    const sync = async () => {
      if (state.running || userHold.current) {
        const result = await shieldService.enableSessionGuards();
        if (!live) return;
        setKeepAwakeOn(result.keepAwake);
        setDndOn(result.dnd);
      } else {
        await shieldService.disableSessionGuards();
        if (!live) return;
        setKeepAwakeOn(false);
        setDndOn(false);
      }
    };
    void sync();
    return () => {
      live = false;
    };
  }, [state.running]);

  const percent = 1 - state.remainingSeconds / Math.max(state.durationSeconds, 1);

  const activateShield = async () => {
    setBusy(true);
    try {
      const result = await shieldService.enableSessionGuards();
      userHold.current = true;
      setKeepAwakeOn(result.keepAwake);
      setDndOn(result.dnd);
      if (result.dnd) {
        Alert.alert(
          'Study Shield',
          'Screen stay-awake is on and Do Not Disturb (priority only) is on for this session.',
        );
        return;
      }
      if (result.keepAwake && result.nativeDndSupported && !result.dndAccessGranted) {
        Alert.alert(
          'Study Shield',
          'Screen stay-awake is on. Do Not Disturb is not on because Android has not granted notification policy access. Study Flow will not pretend DND is active.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Grant access', onPress: () => void shieldService.openDndAccessSettings() },
          ],
        );
        return;
      }
      if (result.keepAwake) {
        Alert.alert(
          'Study Shield',
          result.nativeDndSupported
            ? 'Screen stay-awake is on. Do Not Disturb was not changed.'
            : Platform.OS === 'android'
              ? 'Screen stay-awake is on. This Expo Go or current binary cannot set Do Not Disturb. Open Android DND settings to silence notifications. App blocking is not available.'
              : 'Screen stay-awake is on. App blocking is not available on this device.',
          Platform.OS === 'android'
            ? [
                { text: 'OK', style: 'cancel' },
                { text: 'Open DND settings', onPress: () => void shieldService.openDndSettings() },
              ]
            : undefined,
        );
        return;
      }
      Alert.alert('Study Shield', 'Keep-awake is not available on this platform.');
    } catch (error) {
      Alert.alert('Study Shield', userFacingError(error, 'Unable to activate Study Shield.'));
    } finally {
      setBusy(false);
    }
  };

  const deactivateShield = async () => {
    setBusy(true);
    try {
      await shieldService.disableSessionGuards();
      userHold.current = false;
      setKeepAwakeOn(false);
      setDndOn(false);
    } catch (error) {
      Alert.alert('Study Shield', userFacingError(error, 'Unable to turn Study Shield off.'));
    } finally {
      setBusy(false);
    }
  };

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
        <Text style={[styles.copy, { color: colors.secondaryText }]}>{shield.summary}</Text>
        <Text style={[styles.status, { color: keepAwakeOn ? colors.success : colors.mutedText }]}>
          Stay-awake: {keepAwakeOn ? 'On' : 'Off'}
        </Text>
        <Text style={[styles.status, { color: dndOn ? colors.success : colors.mutedText }]}>
          Do Not Disturb: {dndOn ? 'On' : shield.dndAccessGranted ? 'Granted, idle' : 'Not active'}
        </Text>
        <Text style={[styles.status, { color: colors.mutedText }]}>App blocking: Not available</Text>
        {hasProAccess(tier) ? null : (
          <Pressable onPress={() => router.push('/subscription')}>
            <Text style={{ color: colors.accent, fontWeight: '800', marginTop: 8 }}>
              Unlock Study Shield extras with Pro
            </Text>
          </Pressable>
        )}
        <Button
          label={keepAwakeOn || dndOn ? 'Turn off Study Shield' : 'Activate Study Shield'}
          variant={keepAwakeOn || dndOn ? 'secondary' : 'primary'}
          onPress={() => void (keepAwakeOn || dndOn ? deactivateShield() : activateShield())}
          loading={busy}
          style={{ marginTop: 12 }}
        />
        {Platform.OS === 'android' ? (
          <Button
            label={shield.nativeDndSupported ? 'Grant Do Not Disturb access' : 'Open Do Not Disturb settings'}
            variant="ghost"
            onPress={() =>
              void (shield.nativeDndSupported
                ? shieldService.openDndAccessSettings()
                : shieldService.openDndSettings())
            }
            style={{ marginTop: 8 }}
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
  status: { marginTop: 8, fontWeight: '700' },
});
