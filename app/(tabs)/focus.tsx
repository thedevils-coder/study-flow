import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, EmptyState, Row } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { studyData } from '@/services/study-data';
import { FocusSession } from '@/types';
import { endOfDay, endOfWeek, formatDuration, startOfDay, startOfWeek } from '@/lib/dates';

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
      const [today, week] = await Promise.all([
        studyData.focusSessions(session.id, startOfDay(now), endOfDay(now)),
        studyData.focusSessions(session.id, startOfWeek(now), endOfWeek(now)),
      ]);
      setHistory([...today].reverse());
      setTodaySeconds(today.reduce((sum, item) => sum + item.duration_seconds, 0));
      setWeekSeconds(week.reduce((sum, item) => sum + item.duration_seconds, 0));
    };

    void load();
  }, [session]);

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
            const duration = focusSeconds;
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
  const elapsed = useMemo(() => formatDuration(elapsedRef.current || focusSeconds - seconds), [seconds, focusSeconds]);

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>{tr('focus')}</Text>
        <Text style={s.select}>{tr(settings.focusMode === 'deep' ? 'deepWork' : 'pomodoro')}</Text>
        <View style={s.ring}>
          <Text style={s.clock}>{clock}</Text>
          <Text style={s.muted}>{tr('focusTime')}</Text>
          <Text style={s.muted}>{tr('elapsed')}: {elapsed}</Text>
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
        }} style={s.reset}>
          {tr('reset')}
        </Text>
        <View style={s.stats}>
          <Card style={{ flex: 1 }}>
            <Text style={s.muted}>{tr('todayStudyTime')}</Text>
            <Text style={s.metric}>{formatDuration(todaySeconds)}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={s.muted}>{tr('weeklyStudyTime')}</Text>
            <Text style={s.metric}>{formatDuration(weekSeconds)}</Text>
          </Card>
        </View>
        <Card>
          <Text style={s.shield}>{tr('studyShield')} 🛡️</Text>
          <Text style={s.muted}>{tr('shieldBody')}</Text>
          <Row icon="phone-portrait-outline" label={tr('blockedApps')} value={tr('shieldUnavailable')} />
          <Row icon="globe-outline" label={tr('blockedSites')} value={tr('shieldUnavailable')} />
          <Text style={s.limit}>{tr('shieldLimitation')}</Text>
        </Card>
        <Text style={s.section}>{tr('sessionHistory')}</Text>
        {history.length === 0 ? (
          <EmptyState title={tr('noSessionsYet')} />
        ) : (
          history.slice(0, 8).map((item, index) => (
            <Card key={`${item.started_at}-${index}`}>
              <Text style={s.taskTitle}>{formatDuration(item.duration_seconds)}</Text>
              <Text style={s.muted}>{new Date(item.started_at).toLocaleString()}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: 'white' },
  inner: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '900', color: colors.ink },
  select: {
    alignSelf: 'center',
    backgroundColor: colors.soft,
    padding: 10,
    borderRadius: 16,
    marginTop: 20,
    fontWeight: '700',
    color: colors.ink,
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
  clock: { fontSize: 42, fontWeight: '900', color: colors.ink },
  muted: { color: colors.muted, marginTop: 5 },
  reset: { alignSelf: 'center', color: colors.purple, fontWeight: '800', marginTop: 14 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  metric: { fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 6 },
  shield: { fontSize: 18, fontWeight: '900', color: colors.ink },
  limit: { marginTop: 10, color: colors.muted, fontSize: 12, lineHeight: 18 },
  section: { fontWeight: '900', fontSize: 18, color: colors.ink, marginTop: 8, marginBottom: 8 },
  taskTitle: { fontWeight: '800', color: colors.ink },
});
