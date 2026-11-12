import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { GoalCard } from '@/components/GoalCard';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { StatCard } from '@/components/StatCard';
import { formatDuration } from '@/lib/dates';
import { hasProAccess } from '@/lib/entitlements';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';

export default function Progress() {
  const { tier } = useAuth();
  const { progress, goals, loading, error, refresh } = useStudy();
  const { colors } = useTheme();
  const max = Math.max(...progress.chart.map((item) => item.seconds), 1);
  const changeLabel =
    progress.weekSessions === 0 && progress.weekSeconds === 0
      ? 'No focus sessions yet'
      : `${progress.weekChangePercent >= 0 ? 'Up' : 'Down'} ${Math.abs(progress.weekChangePercent)}% from last week`;

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>Progress</Text>
      {loading ? <LoadingState message="Calculating from your sessions..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}

      <Text style={[styles.kicker, { color: colors.secondaryText }]}>Today</Text>
      <View style={styles.row}>
        <StatCard label="Study time" value={formatDuration(progress.todaySeconds)} />
        <StatCard label="Tasks" value={String(progress.todayCompletedTasks)} />
      </View>
      <View style={[styles.row, { marginTop: 12 }]}>
        <StatCard label="Focus sessions" value={String(progress.todaySessions)} />
        <StatCard label="Streak" value={`${progress.currentStreak}d`} />
      </View>

      <Text style={[styles.kicker, { color: colors.secondaryText }]}>This week</Text>
      <Card style={{ backgroundColor: colors.accentSoft, borderColor: 'transparent' }}>
        <Text style={{ color: colors.secondaryText, fontWeight: '700' }}>Study time</Text>
        <Text style={[styles.hero, { color: colors.text }]}>{formatDuration(progress.weekSeconds)}</Text>
        <Text style={{ color: colors.success, marginTop: 4 }}>{changeLabel}</Text>
        <View style={styles.chart}>
          {progress.chart.map((item) => (
            <View key={item.key} style={styles.chartItem}>
              <View
                style={[
                  styles.bar,
                  {
                    height: item.seconds === 0 ? 4 : Math.max(8, (item.seconds / max) * 130),
                    backgroundColor: colors.accent,
                  },
                ]}
              />
              <Text style={{ color: colors.mutedText, fontSize: 10 }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.row}>
        <StatCard label="Sessions" value={String(progress.weekSessions)} />
        <StatCard label="Study days" value={String(progress.studyDaysThisWeek)} />
      </View>
      <View style={[styles.row, { marginTop: 12 }]}>
        <StatCard label="Tasks done" value={String(progress.weekCompletedTasks)} />
        <StatCard label="Avg session" value={formatDuration(progress.averageSessionSeconds)} />
      </View>

      {hasProAccess(tier) ? (
        <Card>
          <Text style={[styles.heading, { color: colors.text }]}>Insights</Text>
          {progress.insights.map((insight) => (
            <Text key={insight} style={[styles.insight, { color: colors.text }]}>
              {insight}
            </Text>
          ))}
        </Card>
      ) : (
        <Card>
          <Text style={[styles.heading, { color: colors.text }]}>Advanced analytics</Text>
          <Text style={{ color: colors.secondaryText, lineHeight: 20 }}>
            Weekly comparison, average session length and deeper insights are included with Pro and the free trial.
          </Text>
          <Button label="Upgrade to Pro" onPress={() => router.push('/subscription')} style={{ marginTop: 12 }} />
        </Card>
      )}

      <Text style={[styles.kicker, { color: colors.secondaryText }]}>Goals</Text>
      {goals.length === 0 ? (
        <Button label="Create a goal" variant="secondary" onPress={() => router.push('/goals')} />
      ) : (
        goals.slice(0, 3).map((goal) => (
          <GoalCard key={goal.id} goal={goal} onPress={() => router.push('/goals')} />
        ))
      )}
      <BannerAdSlot />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', marginBottom: 8 },
  kicker: { marginTop: 18, marginBottom: 8, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 12 },
  hero: { fontSize: 30, fontWeight: '900', marginTop: 4 },
  chart: { height: 160, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: 16 },
  chartItem: { alignItems: 'center', justifyContent: 'flex-end', height: 150, gap: 4 },
  bar: { width: 16, borderRadius: 5 },
  heading: { fontSize: 18, fontWeight: '800' },
  insight: { marginTop: 12, lineHeight: 20 },
});
