import { formatDuration, startOfDay } from '@/lib/dates';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatCard } from '@/components/StatCard';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';

export default function FocusHistory() {
  const { sessions, progress } = useStudy();
  const { colors } = useTheme();
  const today = startOfDay(new Date());
  const todays = sessions.filter((session) => new Date(session.startedAt) >= today);
  const recent = sessions.slice(0, 20);
  const total = sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const average =
    sessions.length > 0 ? Math.round(total / sessions.length) : 0;

  return (
    <Screen>
      <ScreenHeader title="Focus history" back />
      <View style={styles.row}>
        <StatCard label="Today" value={formatDuration(todays.reduce((sum, item) => sum + item.durationSeconds, 0))} />
        <StatCard label="Total" value={formatDuration(total)} />
      </View>
      <View style={[styles.row, { marginTop: 12, marginBottom: 12 }]}>
        <StatCard label="Average" value={formatDuration(average)} />
        <StatCard label="Sessions" value={String(sessions.length)} />
      </View>

      <Text style={[styles.heading, { color: colors.text }]}>Recent sessions</Text>
      {recent.length === 0 ? (
        <EmptyState
          icon="timer-outline"
          title="No sessions yet"
          message="Complete a 25-minute focus session to see it here."
        />
      ) : (
        recent.map((session) => (
          <Card key={session.id}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{formatDuration(session.durationSeconds)}</Text>
            <Text style={{ color: colors.secondaryText, marginTop: 4 }}>
              {new Date(session.startedAt).toLocaleString()} · {session.sessionType}
            </Text>
          </Card>
        ))
      )}
      <Text style={{ color: colors.mutedText, marginTop: 8 }}>
        Week total: {formatDuration(progress.weekSeconds)}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  heading: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
});
