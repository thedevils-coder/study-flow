import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, EmptyState, ErrorState, ThemedSafeArea } from '@/components/ui';
import { studyData } from '@/services/study-data';
import { useApp } from '@/store/app-store';
import { formatDurationLocale, t } from '@/i18n';
import { useColors } from '@/lib/use-colors';
import { FocusSession } from '@/types';
import {
  addDays,
  endOfDay,
  startOfDay,
  startOfWeek,
} from '@/lib/dates';

export default function Progress() {
  const { session, tasks, goals, streak } = useApp();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [previousWeekSessions, setPreviousWeekSessions] = useState<FocusSession[]>([]);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const language = session!.language;
  const tr = (key: string) => t(language, key);
  const palette = useColors();
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const previousWeekStart = useMemo(() => addDays(weekStart, -7), [weekStart]);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const today = startOfDay(new Date());
      const [weeklyData, previousWeeklyData, todayData] = await Promise.all([
        studyData.focusSessions(session.id, weekStart, weekEnd),
        studyData.focusSessions(session.id, previousWeekStart, weekStart),
        studyData.focusSessions(session.id, today, endOfDay(today)),
      ]);
      setSessions(weeklyData);
      setPreviousWeekSessions(previousWeeklyData);
      setTodaySeconds(todayData.reduce((sum, item) => sum + item.duration_seconds, 0));
    } catch {
      setError(true);
      setSessions([]);
      setPreviousWeekSessions([]);
    } finally {
      setLoading(false);
    }
  }, [session, weekStart, weekEnd, previousWeekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  const weeklySeconds = sessions.reduce((total, item) => total + item.duration_seconds, 0);
  const previousWeeklySeconds = previousWeekSessions.reduce(
    (total, item) => total + item.duration_seconds,
    0,
  );
  const weeklyChangePercent =
    previousWeeklySeconds === 0
      ? weeklySeconds > 0
        ? 100
        : 0
      : Math.round(((weeklySeconds - previousWeeklySeconds) / previousWeeklySeconds) * 100);
  const completedTasks = tasks.filter((task) => task.done).length;
  const completionRate = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);
  const averageSessionSeconds =
    sessions.length > 0 ? Math.round(weeklySeconds / sessions.length) : 0;

  const chart = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const dayStart = addDays(weekStart, index);
        const dayEnd = addDays(dayStart, 1);
        const seconds = sessions
          .filter((item) => {
            const started = new Date(item.started_at);
            return started >= dayStart && started < dayEnd;
          })
          .reduce((total, item) => total + item.duration_seconds, 0);
        return {
          seconds,
          label: new Intl.DateTimeFormat(language, { weekday: 'narrow' }).format(dayStart),
          index,
        };
      }),
    [sessions, weekStart, language],
  );
  const maxSeconds = Math.max(...chart.map((item) => item.seconds), 1);
  const activeGoals = goals
    .filter((goal) => goal.targetValue > 0)
    .sort((a, b) => b.currentValue / b.targetValue - a.currentValue / a.targetValue)
    .slice(0, 3);

  return (
    <ThemedSafeArea>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.title, { color: palette.ink }]}>{tr('progress')}</Text>
        <Text style={[s.week, { backgroundColor: palette.soft, color: palette.ink }]}>{tr('thisWeek')}</Text>
        {!loading && !error && weeklySeconds === 0 && completedTasks === 0 ? (
          <EmptyState title={tr('noProgressYet')} body={tr('addTaskHint')} />
        ) : null}
        {error ? (
          <ErrorState title={tr('errorGeneric')} onRetry={load} retryLabel={tr('retry')} />
        ) : (
          <Card style={[s.hero, { backgroundColor: palette.soft }]}>
            <Text style={[s.muted, { color: palette.muted }]}>{tr('studyTime')}</Text>
            {loading ? (
              <ActivityIndicator size="small" color={palette.purple} style={s.loader} />
            ) : (
              <>
                <Text style={[s.time, { color: palette.ink }]}>{formatDurationLocale(language, weeklySeconds)}</Text>
                <Text style={[s.good, { color: palette.success }]}>
                  {sessions.length === 0
                    ? tr('noFocusSessionsYet')
                    : `${weeklyChangePercent >= 0 ? tr('upFromLastWeek') : tr('downFromLastWeek')} ${Math.abs(weeklyChangePercent)}%`}
                </Text>
              </>
            )}
            <View style={s.chart}>
              {chart.map((item) => {
                const height = item.seconds === 0 ? 4 : Math.max(8, (item.seconds / maxSeconds) * 130);
                return (
                  <View key={item.index} style={s.chartItem}>
                    <View style={[s.bar, { height, backgroundColor: palette.purple }]} />
                    <Text style={[s.day, { color: palette.muted }]}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}
        <View style={s.grid}>
          <Card style={s.small}>
            <Text style={[s.muted, { color: palette.muted }]}>{tr('todayStudyTime')}</Text>
            <Text style={[s.metric, { color: palette.ink }]}>{formatDurationLocale(language, todaySeconds)}</Text>
          </Card>
          <Card style={s.small}>
            <Text style={[s.muted, { color: palette.muted }]}>{tr('lastWeek')}</Text>
            <Text style={[s.metric, { color: palette.ink }]}>
              {formatDurationLocale(language, previousWeeklySeconds)}
            </Text>
          </Card>
        </View>
        <View style={s.grid}>
          <Card style={s.small}>
            <Text style={[s.muted, { color: palette.muted }]}>{tr('tasksCompleted')}</Text>
            <Text style={[s.metric, { color: palette.ink }]}>{completedTasks}</Text>
          </Card>
          <Card style={s.small}>
            <Text style={[s.muted, { color: palette.muted }]}>{tr('averageSession')}</Text>
            <Text style={[s.metric, { color: palette.ink }]}>
              {formatDurationLocale(language, averageSessionSeconds)}
            </Text>
          </Card>
        </View>
        <View style={s.grid}>
          <Card style={s.small}>
            <Text style={[s.muted, { color: palette.muted }]}>{tr('currentStreak')}</Text>
            <Text style={[s.metric, { color: palette.ink }]}>{streak.current}</Text>
          </Card>
          <Card style={s.small}>
            <Text style={[s.muted, { color: palette.muted }]}>{tr('longestStreak')}</Text>
            <Text style={[s.metric, { color: palette.ink }]}>{streak.longest}</Text>
          </Card>
        </View>
        <Card>
          <Text style={[s.section, { color: palette.ink }]}>{tr('completionRate')}</Text>
          <Text style={[s.metric, { color: palette.ink }]}>{completionRate}%</Text>
        </Card>
        {activeGoals.length > 0 && (
          <Card style={s.goalsCard}>
            <Text style={[s.section, { color: palette.ink }]}>{tr('goals')}</Text>
            {activeGoals.map((goal) => {
              const percent = Math.round(Math.min(goal.currentValue / goal.targetValue, 1) * 100);
              return (
                <View key={goal.id} style={s.goalRow}>
                  <View style={s.goalHeader}>
                    <Text style={[s.goalTitle, { color: palette.ink }]}>{goal.title}</Text>
                    <Text style={[s.goalPercent, { color: palette.purple }]}>{percent}%</Text>
                  </View>
                  <View style={[s.goalTrack, { backgroundColor: palette.soft }]}>
                    <View style={[s.goalFill, { width: `${percent}%`, backgroundColor: palette.purple }]} />
                  </View>
                  <Text style={[s.goalMeta, { color: palette.muted }]}>
                    {goal.currentValue} / {goal.targetValue} {goal.unit}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}
        <Card>
          <Text style={[s.section, { color: palette.ink }]}>{tr('insights')}</Text>
          <Text style={[s.insight, { color: palette.ink }]}>
            {formatDurationLocale(language, weeklySeconds)} · {tr('thisWeek')}
          </Text>
          <Text style={[s.insight, { color: palette.ink }]}>
            {formatDurationLocale(language, previousWeeklySeconds)} · {tr('lastWeek')}
          </Text>
          <Text style={[s.insight, { color: palette.ink }]}>
            {completedTasks} {tr('tasksCompleted')}
          </Text>
          <Text style={[s.insight, { color: palette.ink }]}>
            {sessions.length === 0
              ? tr('noFocusSessionsYet')
              : `${sessions.length} · ${tr('averageSession')} ${formatDurationLocale(language, averageSessionSeconds)}`}
          </Text>
          <Text style={[s.insight, { color: palette.ink }]}>
            {streak.current} {tr('currentStreak')}
          </Text>
          <Text style={[s.insight, { color: palette.ink }]}>{tr('memoryUnavailable')}</Text>
        </Card>
        <Pressable onPress={load} accessibilityRole="button">
          <Text style={[s.retry, { color: palette.purple }]}>{tr('retry')}</Text>
        </Pressable>
      </ScrollView>
    </ThemedSafeArea>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900' },
  week: { alignSelf: 'center', padding: 10, borderRadius: 15, margin: 18, overflow: 'hidden' },
  hero: {},
  muted: { fontWeight: '600' },
  loader: { marginTop: 15, alignSelf: 'flex-start' },
  time: { fontSize: 29, fontWeight: '900', marginTop: 5 },
  good: { fontSize: 12, marginTop: 4 },
  chart: { height: 160, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: 16 },
  chartItem: { alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: 150 },
  bar: { width: 16, borderRadius: 5 },
  day: { fontSize: 10 },
  grid: { flexDirection: 'row', gap: 12 },
  small: { flex: 1 },
  metric: { fontSize: 25, fontWeight: '900', marginTop: 6 },
  goalsCard: { marginTop: 12 },
  goalRow: { marginTop: 16 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitle: { flex: 1, fontWeight: '800' },
  goalPercent: { fontWeight: '900' },
  goalTrack: { height: 8, borderRadius: 8, overflow: 'hidden', marginTop: 8 },
  goalFill: { height: '100%', borderRadius: 8 },
  goalMeta: { marginTop: 5, fontSize: 12 },
  section: { fontWeight: '900', fontSize: 17 },
  insight: { marginTop: 15 },
  retry: { fontWeight: '800', textAlign: 'center', marginTop: 8 },
});
