import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card, EmptyState } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isOverdue,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@/lib/dates';

type PlannerView = 'day' | 'week' | 'month';

export default function Planner() {
  const { session, tasks, toggleTask, deleteTask } = useApp();
  const [view, setView] = useState<PlannerView>('day');
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const tr = (key: string) => t(session!.language, key);

  const range = useMemo(() => {
    if (view === 'day') {
      return { start: startOfDay(cursor), end: endOfDay(cursor) };
    }
    if (view === 'week') {
      return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
    }
    return { start: startOfMonth(cursor), end: endOfMonth(cursor) };
  }, [cursor, view]);

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.scheduledAt) {
          return view === 'day' && startOfDay(cursor).getTime() === startOfDay(new Date()).getTime();
        }
        const scheduled = new Date(task.scheduledAt);
        if (Number.isNaN(scheduled.getTime())) {
          return false;
        }
        return scheduled >= range.start && scheduled < range.end;
      }),
    [range, tasks, view, cursor],
  );

  const title =
    view === 'day'
      ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(cursor)
      : view === 'week'
        ? tr('thisWeek')
        : new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(cursor);

  const shift = (direction: number) => {
    if (view === 'day') {
      setCursor(addDays(cursor, direction));
    } else if (view === 'week') {
      setCursor(addDays(cursor, direction * 7));
    } else {
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + direction);
      setCursor(next);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert(tr('deleteTask'), tr('confirmDelete'), [
      { text: tr('cancel'), style: 'cancel' },
      {
        text: tr('deleteTask'),
        style: 'destructive',
        onPress: () => {
          deleteTask(id).catch(() => Alert.alert(tr('deleteTask'), tr('unableToDeleteTask')));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{tr('planner')}</Text>
          <Text onPress={() => router.push('/task/new')} style={styles.add}>
            {tr('addTask')}
          </Text>
        </View>
        <View style={styles.nav}>
          <Pressable onPress={() => shift(-1)} accessibilityLabel={tr('previous')}>
            <Text style={styles.navBtn}>‹</Text>
          </Pressable>
          <Pressable onPress={() => setCursor(startOfDay(new Date()))}>
            <Text style={styles.subtitle}>{title}</Text>
          </Pressable>
          <Pressable onPress={() => shift(1)} accessibilityLabel={tr('next')}>
            <Text style={styles.navBtn}>›</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {(['day', 'week', 'month'] as PlannerView[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.tab, view === item && styles.activeTab]}
              onPress={() => setView(item)}
            >
              <Text style={[styles.tabText, view === item && styles.activeTabText]}>{tr(item)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {visibleTasks.length === 0 ? (
          <EmptyState title={tr('noTasksScheduled')} body={tr('addTaskHint')} />
        ) : (
          visibleTasks.map((task) => (
            <Card key={task.id}>
              <View style={styles.taskRow}>
                <TouchableOpacity
                  style={[styles.checkbox, task.done && styles.checkboxDone]}
                  onPress={() => toggleTask(task.id)}
                  accessibilityLabel={task.done ? tr('markIncomplete') : tr('markComplete')}
                >
                  {task.done ? <Text style={styles.checkmark}>✓</Text> : null}
                </TouchableOpacity>
                <Pressable style={styles.taskInfo} onPress={() => router.push(`/task/${task.id}`)}>
                  <Text style={[styles.taskTitle, task.done && styles.taskDone]}>{task.title}</Text>
                  <Text style={styles.taskTime}>
                    {task.scheduledAt ? task.time : tr('anyTime')}
                    {isOverdue(task.scheduledAt, task.done) ? ` · ${tr('overdue')}` : ''}
                  </Text>
                </Pressable>
                <TouchableOpacity onPress={() => confirmDelete(task.id)}>
                  <Text style={styles.deleteText}>{tr('deleteTask')}</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.soft },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: colors.ink },
  add: { color: colors.purple, fontWeight: '800' },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  navBtn: { fontSize: 32, color: colors.purple, paddingHorizontal: 8 },
  subtitle: { fontSize: 15, color: colors.muted, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  activeTab: { backgroundColor: colors.purple },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.muted },
  activeTabText: { color: '#FFFFFF' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: colors.purple, borderColor: colors.purple },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  taskDone: { textDecorationLine: 'line-through', color: colors.muted },
  taskTime: { marginTop: 3, fontSize: 13, color: colors.muted },
  deleteText: { fontSize: 13, fontWeight: '700', color: '#C2410C' },
});
