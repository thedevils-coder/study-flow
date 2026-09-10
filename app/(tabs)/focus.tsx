import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Button, Card, EmptyState, Row, ThemedSafeArea } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { formatDateTime, formatDurationLocale, t } from '@/i18n';
import { useColors } from '@/lib/use-colors';
import { studyData } from '@/services/study-data';
import { FocusSession } from '@/types';
import { endOfDay, startOfDay, startOfWeek, endOfWeek, addDays } from '@/lib/dates';

export default function Focus() {
  const { session, settings, recordFocus } = useApp();
  const focusSeconds = Math.max(5, (settings.focusMinutes || 25) * 60);
  const [seconds, setSeconds] = useState(focusSeconds);
  const [running, setRunning] = useState(false);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [weekSeconds, setWeekSeconds] = useState(0);
  const [history, setHistory] = useState<FocusSession[]>([]);
  const startedAtRef = useRef<Date | null>(null);
  const recordedRef = useRef(false);
  const elapsedRef = useRef(0);
  const tr = (key: string) => t(session!.language, key);
  const palette = useColors();
  const language = session!.language;
  const modeKey =
    settings.focusMode === 'deep' ? 'deepWork' : settings.focusMode === 'balanced' ? 'balanced' : 'pomodoro';

  useEffect(() => {
    if (!running) {
      setSeconds(focusSeconds - elapsedRef.current);
    }
  }, [focusSeconds, running]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const load = async () => {
      const now = new Date();
      const [today, week, recent] = await Promise.all([
        studyData.focusSessions(session.id, startOfDay(now), endOfDay(now)),
        studyData.focusSessions(session.id, startOfWeek(now), endOfWeek(now)),
        studyData.focusSessions(session.id, addDays(startOfDay(now), -14), endOfDay(now)),
      ]);
      setHistory([...recent].reverse());
      setTodaySeconds(today.reduce((sum, item) => sum + item.duration_seconds, 0));
      setWeekSeconds(week.reduce((sum, item) => sum + item.duration_seconds, 0));
    };

    void load();
  }, [session]);

  useEffect(() => {
    if (!running) {
      void deactivateKeepAwake('focus');
      return;
    }
    void activateKeepAwakeAsync('focus');
    return () => {
      void deactivateKeepAwake('focus');
    };
  }, [running]);

  useEffect(() => {
    if (!running) {
      return;
    }

    const timer = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setRunning(false);
          if (startedAtRef.current && !recordedRef.current) {
            recordedRef.current = true;
            const startedAt = startedAtRef.current;
            const duration = Math.max(1, elapsedRef.current || focusSeconds);
            recordFocus(startedAt, duration)
              .then(() => {
                setTodaySeconds((value) => value + duration);
                setWeekSeconds((value) => value + duration);
                setHistory((list) => [
                  {
                    started_at: startedAt.toISOString(),
                    ended_at: new Date().toISOString(),
                    duration_seconds: duration,
                  },
                  ...list,
                ]);
                Alert.alert(t(session!.language, 'focus'), t(session!.language, 'sessionSaved'));
              })
              .catch(() => {
                recordedRef.current = false;
                Alert.alert(t(session!.language, 'focus'), t(session!.language, 'unableToSaveFocus'));
              });
          }
          elapsedRef.current = 0;
          return 0;
        }
        elapsedRef.current += 1;
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, recordFocus, focusSeconds, session]);

  const start = () => {
    if (seconds <= 0) {
      setSeconds(focusSeconds);
      elapsedRef.current = 0;
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

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const elapsed = useMemo(
    () => formatDurationLocale(language, elapsedRef.current || focusSeconds - seconds),
    [seconds, focusSeconds, language],
  );

  return (
    <ThemedSafeArea>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <Text style={[s.title, { color: palette.ink }]}>{tr('focus')}</Text>
        <Text style={[s.select, { backgroundColor: palette.soft, color: palette.ink }]}>{tr(modeKey)}</Text>
        <View style={[s.ring, { borderColor: palette.purple }]}>
          <Text style={[s.clock, { color: palette.ink }]}>{clock}</Text>
          <Text style={[s.muted, { color: palette.muted }]}>{tr('focusTime')}</Text>
          <Text style={[s.muted, { color: palette.muted }]}>{tr('elapsed')}: {elapsed}</Text>
        </View>
        <Button
          label={running ? tr('pause') : seconds < focusSeconds && seconds > 0 ? tr('resume') : tr('start')}
          onPress={running ? () => setRunning(false) : start}
        />
        <Text onPress={() => {
          setRunning(false);
          setSeconds(focusSeconds);
          startedAtRef.current = null;
          recordedRef.current = false;
          elapsedRef.current = 0;
        }} style={[s.reset, { color: palette.purple }]}>
          {tr('reset')}
        </Text>
        <View style={s.stats}>
          <Card style={{ flex: 1 }}>
            <Text style={[s.muted, { color: palette.muted }]}>{tr('todayStudyTime')}</Text>
            <Text style={[s.metric, { color: palette.ink }]}>{formatDurationLocale(language, todaySeconds)}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={[s.muted, { color: palette.muted }]}>{tr('weeklyStudyTime')}</Text>
            <Text style={[s.metric, { color: palette.ink }]}>{formatDurationLocale(language, weekSeconds)}</Text>
          </Card>
        </View>
        <Card>
          <Text style={[s.shield, { color: palette.ink }]}>{tr('studyShield')} 🛡️</Text>
          <Text style={[s.muted, { color: palette.muted }]}>{tr('shieldBody')}</Text>
          <Row icon="phone-portrait-outline" label={tr('blockedApps')} value={tr('shieldUnavailable')} />
          <Row icon="globe-outline" label={tr('blockedSites')} value={tr('shieldUnavailable')} />
          <Text style={[s.limit, { color: palette.muted }]}>{tr('shieldLimitation')}</Text>
        </Card>
        <Text style={[s.section, { color: palette.ink }]}>{tr('sessionHistory')}</Text>
        {history.length === 0 ? (
          <EmptyState title={tr('noSessionsYet')} />
        ) : (
          history.slice(0, 20).map((item, index) => (
            <Card key={`${item.started_at}-${index}`}>
              <Text style={[s.taskTitle, { color: palette.ink }]}>{formatDurationLocale(language, item.duration_seconds)}</Text>
              <Text style={[s.muted, { color: palette.muted }]}>{formatDateTime(language, item.started_at)}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </ThemedSafeArea>
  );
}

const s = StyleSheet.create({
  inner: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '900' },
  select: {
    alignSelf: 'center',
    padding: 10,
    borderRadius: 16,
    marginTop: 20,
    fontWeight: '700',
    overflow: 'hidden',
  },
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
  muted: { marginTop: 5 },
  reset: { alignSelf: 'center', fontWeight: '800', marginTop: 14 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  metric: { fontSize: 20, fontWeight: '900', marginTop: 6 },
  shield: { fontSize: 18, fontWeight: '900' },
  limit: { marginTop: 10, fontSize: 12, lineHeight: 18 },
  section: { fontWeight: '900', fontSize: 18, marginTop: 8, marginBottom: 8 },
  taskTitle: { fontWeight: '800' },
});
