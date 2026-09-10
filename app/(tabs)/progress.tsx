import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ErrorState } from '@/components/ui';
import { colors } from '@/constants/theme';
import { studyData } from '@/services/study-data';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { FocusSession } from '@/types';
import {
  addDays,
  endOfDay,
  formatDuration,
  startOfDay,
  startOfWeek,
} from '@/lib/dates';
import { canUseAdvancedAnalytics, getTier } from '@/lib/entitlements';

export default function Progress() {
  const { session, tasks, goals, streak } = useApp();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [previousWeekSessions, setPreviousWeekSessions] = useState<FocusSession[]>([]);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const tr = (key: string) => t(session!.language, key);
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const previousWeekStart = useMemo(() => addDays(weekStart, -7), [weekStart]);
  const tier = getTier(session);

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
          label: new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(dayStart),
          index,
        };
      }),
    [sessions, weekStart],
  );
  const maxSeconds = Math.max(...chart.map((item) => item.seconds), 1);
  const activeGoals = goals
    .filter((goal) => goal.targetValue > 0)
    .sort((a, b) => b.currentValue / b.targetValue - a.currentValue / a.targetValue)
    .slice(0, 3);

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>{tr('progress')}</Text>
        <Text style={s.week}>{tr('thisWeek')}</Text>
        {error ? (
          <ErrorState title={tr('errorGeneric')} onRetry={load} retryLabel={tr('retry')} />
        ) : (
          <Card style={s.hero}>
            <Text style={s.muted}>{tr('studyTime')}</Text>
            {loading ? (
              <ActivityIndicator size="small" color={colors.purple} style={s.loader} />
            ) : (
              <>
                <Text style={s.time}>{formatDuration(weeklySeconds)}</Text>
                <Text style={s.good}>
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
                    <View style={[s.bar, { height }]} />
                    <Text style={s.day}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}
        <View style={s.grid}>
          <Card style={s.small}>
            <Text style={s.muted}>{tr('todayStudyTime')}</Text>
            <Text style={s.metric}>{formatDuration(todaySeconds)}</Text>
          </Card>
          <Card style={s.small}>
            <Text style={s.muted}>{tr('tasksCompleted')}</Text>
            <Text style={s.metric}>{completedTasks}</Text>
          </Card>
        </View>
        <View style={s.grid}>
          <Card style={s.small}>
            <Text style={s.muted}>{tr('currentStreak')}</Text>
            <Text style={s.metric}>{streak.current}</Text>
          </Card>
          <Card style={s.small}>
            <Text style={s.muted}>{tr('longestStreak')}</Text>
            <Text style={s.metric}>{streak.longest}</Text>
          </Card>
        </View>
        {canUseAdvancedAnalytics(tier) ? (
          <Card>
            <Text style={s.section}>{tr('completionRate')}</Text>
            <Text style={s.metric}>{completionRate}%</Text>
            <Text style={s.muted}>{tr('averageSession')}: {formatDuration(averageSessionSeconds)}</Text>
          </Card>
        ) : null}
        {activeGoals.length > 0 && (
          <Card style={s.goalsCard}>
            <Text style={s.section}>{tr('goals')}</Text>
            {activeGoals.map((goal) => {
              const percent = Math.round(Math.min(goal.currentValue / goal.targetValue, 1) * 100);
              return (
                <View key={goal.id} style={s.goalRow}>
                  <View style={s.goalHeader}>
                    <Text style={s.goalTitle}>{goal.title}</Text>
                    <Text style={s.goalPercent}>{percent}%</Text>
                  </View>
                  <View style={s.goalTrack}>
                    <View style={[s.goalFill, { width: `${percent}%` }]} />
                  </View>
                  <Text style={s.goalMeta}>
                    {goal.currentValue} / {goal.targetValue} {goal.unit}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}
        <Card>
          <Text style={s.section}>{tr('insights')}</Text>
          <Text style={s.insight}>{formatDuration(weeklySeconds)} · {tr('thisWeek')}</Text>
          <Text style={s.insight}>
            {completedTasks} {tr('tasksCompleted')}
          </Text>
          <Text style={s.insight}>
            {sessions.length === 0
              ? tr('noFocusSessionsYet')
              : `${sessions.length} · ${tr('averageSession')} ${formatDuration(averageSessionSeconds)}`}
          </Text>
          <Text style={s.insight}>
            {streak.current} {tr('currentStreak')}
          </Text>
          <Text style={s.insight}>{tr('memoryUnavailable')}</Text>
        </Card>
        <Pressable onPress={load} accessibilityRole="button">
          <Text style={s.retry}>{tr('retry')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: 'white' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: colors.ink },
  week: { alignSelf: 'center', backgroundColor: colors.soft, padding: 10, borderRadius: 15, margin: 18 },
  hero: { backgroundColor: colors.soft },
  muted: { color: colors.muted, fontWeight: '600' },
  loader: { marginTop: 15, alignSelf: 'flex-start' },
  time: { fontSize: 29, fontWeight: '900', color: colors.ink, marginTop: 5 },
  good: { color: colors.success, fontSize: 12, marginTop: 4 },
  chart: { height: 160, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: 16 },
  chartItem: { alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: 150 },
  bar: { width: 16, backgroundColor: colors.purple, borderRadius: 5 },
  day: { fontSize: 10, color: colors.muted },
  grid: { flexDirection: 'row', gap: 12 },
  small: { flex: 1 },
  metric: { fontSize: 25, fontWeight: '900', marginTop: 6, color: colors.ink },
  goalsCard: { marginTop: 12 },
  goalRow: { marginTop: 16 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitle: { flex: 1, fontWeight: '800', color: colors.ink },
  goalPercent: { fontWeight: '900', color: colors.purple },
  goalTrack: { height: 8, backgroundColor: colors.soft, borderRadius: 8, overflow: 'hidden', marginTop: 8 },
  goalFill: { height: '100%', backgroundColor: colors.purple, borderRadius: 8 },
  goalMeta: { marginTop: 5, fontSize: 12, color: colors.muted },
  section: { fontWeight: '900', fontSize: 17, color: colors.ink },
  insight: { marginTop: 15, color: colors.ink },
  retry: { color: colors.purple, fontWeight: '800', textAlign: 'center', marginTop: 8 },
});
