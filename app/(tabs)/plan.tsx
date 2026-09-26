import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { TaskRow } from '@/components/TaskRow';
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  formatDate,
  formatMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@/lib/dates';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import type { Task } from '@/types';

type PlannerView = 'day' | 'week' | 'month';

const inRange = (task: Task, start: Date, end: Date, includeUnscheduled: boolean) => {
  if (!task.scheduledAt) return includeUnscheduled;
  const scheduled = new Date(task.scheduledAt);
  return scheduled >= start && scheduled < end;
};

export default function Plan() {
  const { tasks, updateTask, deleteTask } = useStudy();
  const { colors } = useTheme();
  const [view, setView] = useState<PlannerView>('day');
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  const range = useMemo(() => {
    if (view === 'day') return { start: startOfDay(cursor), end: endOfDay(cursor) };
    if (view === 'week') return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
    return { start: startOfMonth(cursor), end: endOfMonth(cursor) };
  }, [cursor, view]);

  const visible = tasks.filter((task) => inRange(task, range.start, range.end, view === 'day'));

  const title =
    view === 'day' ? formatDate(cursor) : view === 'week' ? 'This week' : formatMonth(cursor);

  const shift = (amount: number) => {
    setCursor((current) => {
      const next = new Date(current);
      if (view === 'day') next.setDate(next.getDate() + amount);
      else if (view === 'week') next.setDate(next.getDate() + amount * 7);
      else next.setMonth(next.getMonth() + amount);
      return startOfDay(next);
    });
  };

  const monthDays = useMemo(() => {
    if (view !== 'month') return [];
    const start = startOfMonth(cursor);
    const gridStart = startOfWeek(start);
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [cursor, view]);

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>Plan</Text>
      <View style={styles.nav}>
        <Pressable onPress={() => shift(-1)}><Text style={{ color: colors.accent, fontWeight: '800' }}>Prev</Text></Pressable>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{title}</Text>
        <Pressable onPress={() => shift(1)}><Text style={{ color: colors.accent, fontWeight: '800' }}>Next</Text></Pressable>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card }]}>
        {(['day', 'week', 'month'] as PlannerView[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => setView(item)}
            style={[styles.tab, view === item && { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.tabText, { color: view === item ? colors.accentText : colors.mutedText }]}>
              {item[0]?.toUpperCase()}{item.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {view === 'month' ? (
        <Card>
          <View style={styles.grid}>
            {monthDays.map((day) => {
              const count = tasks.filter((task) => inRange(task, startOfDay(day), endOfDay(day), false)).length;
              const selected = startOfDay(day).getTime() === startOfDay(cursor).getTime();
              const outside = day.getMonth() !== cursor.getMonth();
              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => {
                    setCursor(startOfDay(day));
                    setView('day');
                  }}
                  style={[
                    styles.dayCell,
                    selected && { backgroundColor: colors.accentSoft },
                  ]}
                >
                  <Text style={{ color: outside ? colors.mutedText : colors.text, fontWeight: '700' }}>
                    {day.getDate()}
                  </Text>
                  {count > 0 ? <View style={[styles.dot, { backgroundColor: colors.accent }]} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No tasks scheduled"
          message="Add a task with a date and time to see it in this view."
          actionLabel="Add task"
          onAction={() => router.push('/task/new')}
        />
      ) : (
        <Card padded={false}>
          <View style={{ paddingHorizontal: 16 }}>
            {visible.map((task) => (
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

      <Button label="Add task" onPress={() => router.push('/task/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  subtitle: { fontSize: 15, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabText: { fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', height: 48, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
});
