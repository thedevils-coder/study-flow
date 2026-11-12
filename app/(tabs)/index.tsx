import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { ProfileAvatar } from '@/components/ProfileAvatar';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { StatCard } from '@/components/StatCard';
import { TaskRow } from '@/components/TaskRow';
import { formatDate, formatDuration, greetingFor, startOfDay } from '@/lib/dates';
import { displayPlanLabel } from '@/lib/entitlements';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';

export default function Home() {
  const { session, tier } = useAuth();
  const { tasks, progress, loading, error, refresh, updateTask, deleteTask } = useStudy();
  const { colors } = useTheme();
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysTasks = tasks.filter((task) => {
    if (!task.scheduledAt) return true;
    const scheduled = new Date(task.scheduledAt);
    return scheduled >= today && scheduled < tomorrow;
  });

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.hello, { color: colors.text }]}>
            {greetingFor()}, {session?.name ?? 'Student'}
          </Text>
          <Text style={[styles.date, { color: colors.secondaryText }]}>{formatDate(new Date())}</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/profile')}>
          <ProfileAvatar uri={session?.avatarUrl} size={48} />
        </Pressable>
      </View>

      {error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}
      {loading && tasks.length === 0 ? <LoadingState message="Loading today..." /> : null}

      <View style={styles.stats}>
        <StatCard label="Study time" value={formatDuration(progress.todaySeconds)} />
        <StatCard label="Tasks done" value={String(progress.todayCompletedTasks)} />
      </View>
      <View style={[styles.stats, { marginTop: 12 }]}>
        <StatCard
          label="Current streak"
          value={`${progress.currentStreak}`}
          hint={progress.currentStreak === 1 ? 'day' : 'days'}
        />
        <StatCard label="Plan" value={displayPlanLabel(tier)} />
      </View>

      <Text style={[styles.section, { color: colors.text }]}>Quick actions</Text>
      <View style={styles.actions}>
        <QuickAction icon="timer-outline" label="Start Focus" onPress={() => router.push('/(tabs)/focus')} />
        <QuickAction icon="sparkles-outline" label="AI Meter" onPress={() => router.push('/ai-meter')} />
        <QuickAction icon="chatbubble-ellipses-outline" label="Ask Leo" onPress={() => router.push('/leo')} />
        <QuickAction icon="calendar-outline" label="Study Plan" onPress={() => router.push('/schedule-maker')} />
      </View>

      <View style={styles.heading}>
        <Text style={[styles.section, { color: colors.text, marginTop: 0 }]}>Today’s tasks</Text>
        <Pressable onPress={() => router.push('/task/new')}>
          <Text style={{ color: colors.accent, fontWeight: '800' }}>Add</Text>
        </Pressable>
      </View>

      {todaysTasks.length === 0 ? (
        <EmptyState
          icon="checkbox-outline"
          title="No tasks yet"
          message="Add your first task to get started."
          actionLabel="Add task"
          onAction={() => router.push('/task/new')}
        />
      ) : (
        <Card padded={false}>
          <View style={{ paddingHorizontal: 16 }}>
            {todaysTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => void updateTask(task.id, { completed: !task.completed })}
                onOpen={() => router.push(`/task/${task.id}`)}
                onDelete={() => void deleteTask(task.id)}
              />
            ))}
          </View>
        </Card>
      )}

      <Button label="View planner" variant="ghost" onPress={() => router.push('/(tabs)/plan')} />
      <BannerAdSlot />
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  hello: { fontSize: 26, fontWeight: '900' },
  date: { marginTop: 4, fontSize: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 12 },
  section: { fontSize: 18, fontWeight: '900', marginTop: 22, marginBottom: 12 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  actionLabel: { fontWeight: '800' },
});
