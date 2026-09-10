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
import { router } from 'expo-router';
import { Card, EmptyState, ThemedSafeArea } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { formatDate, formatDateTime, t } from '@/i18n';
import { useColors } from '@/lib/use-colors';
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isOverdue,
  sortByScheduledAt,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@/lib/dates';

type PlannerView = 'day' | 'week' | 'month';

export default function Planner() {
  const { session, tasks, toggleTask, deleteTask } = useApp();
  const [view, setView] = useState<PlannerView>('day');
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const language = session!.language;
  const tr = (key: string) => t(language, key);
  const palette = useColors();

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
      sortByScheduledAt(
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
      ),
    [range, tasks, view, cursor],
  );

  const title =
    view === 'day'
      ? formatDate(language, cursor)
      : view === 'week'
        ? tr('thisWeek')
        : new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(cursor);

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
    <ThemedSafeArea>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: palette.ink }]}>{tr('planner')}</Text>
          <Text onPress={() => router.push('/task/new')} style={[styles.add, { color: palette.purple }]}>
            {tr('addTask')}
          </Text>
        </View>
        <View style={styles.nav}>
          <Pressable onPress={() => shift(-1)} accessibilityLabel={tr('previous')}>
            <Text style={[styles.navBtn, { color: palette.purple }]}>‹</Text>
          </Pressable>
          <Pressable onPress={() => setCursor(startOfDay(new Date()))}>
            <Text style={[styles.subtitle, { color: palette.muted }]}>{title}</Text>
          </Pressable>
          <Pressable onPress={() => shift(1)} accessibilityLabel={tr('next')}>
            <Text style={[styles.navBtn, { color: palette.purple }]}>›</Text>
          </Pressable>
        </View>

        <View style={[styles.tabs, { backgroundColor: palette.card }]}>
          {(['day', 'week', 'month'] as PlannerView[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.tab, view === item && { backgroundColor: palette.purple }]}
              onPress={() => setView(item)}
            >
              <Text style={[styles.tabText, { color: palette.muted }, view === item && styles.activeTabText]}>
                {tr(item)}
              </Text>
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
                  style={[
                    styles.checkbox,
                    { borderColor: palette.border },
                    task.done && { backgroundColor: palette.purple, borderColor: palette.purple },
                  ]}
                  onPress={() => toggleTask(task.id)}
                  accessibilityLabel={task.done ? tr('markIncomplete') : tr('markComplete')}
                >
                  {task.done ? <Text style={styles.checkmark}>✓</Text> : null}
                </TouchableOpacity>
                <Pressable style={styles.taskInfo} onPress={() => router.push(`/task/${task.id}`)}>
                  <Text style={[styles.taskTitle, { color: palette.ink }, task.done && styles.taskDone]}>
                    {task.title}
                  </Text>
                  <Text style={[styles.taskTime, { color: palette.muted }]}>
                    {task.scheduledAt ? formatDateTime(language, task.scheduledAt) : tr('anyTime')}
                    {isOverdue(task.scheduledAt, task.done) ? ` · ${tr('overdue')}` : ''}
                  </Text>
                </Pressable>
                <TouchableOpacity onPress={() => confirmDelete(task.id)}>
                  <Text style={[styles.deleteText, { color: palette.danger }]}>{tr('deleteTask')}</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '800' },
  add: { fontWeight: '800' },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  navBtn: { fontSize: 32, paddingHorizontal: 8 },
  subtitle: { fontSize: 15, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 4,
    borderRadius: 14,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabText: { fontSize: 14, fontWeight: '700' },
  activeTabText: { color: '#FFFFFF' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EAE7F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#5932E8', borderColor: '#5932E8' },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '700' },
  taskDone: { textDecorationLine: 'line-through' },
  taskTime: { marginTop: 3, fontSize: 13 },
  deleteText: { fontSize: 13, fontWeight: '700', color: '#C2410C' },
});
