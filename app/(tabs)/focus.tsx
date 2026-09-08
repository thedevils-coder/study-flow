import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Row } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';

const FOCUS_SECONDS = 25 * 60;

export default function Focus() {
  const { session, recordFocus } = useApp();

  const [seconds, setSeconds] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);

  const startedAtRef = useRef<Date | null>(null);
  const recordedRef = useRef(false);

  const tr = (key: string) => t(session!.language, key);

  useEffect(() => {
    if (!running) {
      return;
    }

    const timer = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setRunning(false);

          if (
            startedAtRef.current &&
            !recordedRef.current
          ) {
            recordedRef.current = true;

            const startedAt = startedAtRef.current;

            recordFocus(startedAt, FOCUS_SECONDS).catch(() => {
              recordedRef.current = false;

              Alert.alert(
                tr('focus'),
                'Unable to save focus session.',
              );
            });
          }

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, recordFocus]);

  const start = () => {
    if (seconds <= 0) {
      setSeconds(FOCUS_SECONDS);
      startedAtRef.current = new Date();
      recordedRef.current = false;
      setRunning(true);
      return;
    }

    if (!startedAtRef.current) {
      startedAtRef.current = new Date();
    }

    setRunning(true);
  };

  const pause = () => {
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setSeconds(FOCUS_SECONDS);
    startedAtRef.current = null;
    recordedRef.current = false;
  };

  const clock = `${String(Math.floor(seconds / 60)).padStart(
    2,
    '0',
  )}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <SafeAreaView style={s.page}>
      <View style={s.inner}>
        <Text style={s.title}>{tr('focus')}</Text>

        <Text style={s.select}>Pomodoro⌄</Text>

        <View style={s.ring}>
          <Text style={s.clock}>{clock}</Text>
          <Text style={s.muted}>{tr('focusTime')}</Text>
        </View>

        <Button
          label={running ? tr('pause') : tr('start')}
          onPress={running ? pause : start}
        />

        <Text
          onPress={reset}
          style={s.reset}
        >
          Reset
        </Text>

        <View style={s.breaks}>
          <Text>{tr('focusMode')}</Text>
          <Text>{tr('shortBreak')}</Text>
          <Text>{tr('longBreak')}</Text>
        </View>

        <Card>
          <Text style={s.shield}>
            {tr('studyShield')} 🛡️
          </Text>

          <Text style={s.muted}>
            Protect your focus. Stay away from distractions.
          </Text>

          <Row
            icon="phone-portrait-outline"
            label={tr('blockedApps')}
            value="12 apps"
            onPress={() =>
              Alert.alert(
                'Study Shield',
                'App blocking needs a native development build and a device permission.',
              )
            }
          />

          <Row
            icon="globe-outline"
            label={tr('blockedSites')}
            value="8 sites"
            onPress={() =>
              Alert.alert(
                'Study Shield',
                'Website lists are managed by the configured shield provider.',
              )
            }
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: 'white',
  },

  inner: {
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.ink,
  },

  select: {
    alignSelf: 'center',
    backgroundColor: colors.soft,
    padding: 10,
    borderRadius: 16,
    marginTop: 20,
  },

  ring: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 8,
    borderColor: colors.purple,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 28,
  },

  clock: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.ink,
  },

  muted: {
    color: colors.muted,
    marginTop: 5,
  },

  reset: {
    alignSelf: 'center',
    color: colors.purple,
    fontWeight: '800',
    marginTop: 14,
  },

  breaks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
  },

  shield: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
  },
});