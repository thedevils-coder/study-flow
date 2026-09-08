import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';

type PlannerView = 'day' | 'week' | 'month';

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date) => {
  const result = startOfDay(date);
  result.setDate(result.getDate() + 1);
  return result;
};

const startOfWeek = (date: Date) => {
  const result = startOfDay(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
};

const endOfWeek = (date: Date) => {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 7);
  return result;
};

const startOfMonth = (date: Date) => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfMonth = (date: Date) => {
  const result = startOfMonth(date);
  result.setMonth(result.getMonth() + 1);
  return result;
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);

export default function Planner() {
  const { session, tasks, toggleTask, deleteTask } = useApp();
  const [view, setView] = useState<PlannerView>('day');

  const tr = (key: string) => t(session!.language, key);

  const today = useMemo(() => new Date(), []);

  const range = useMemo(() => {
    if (view === 'day') {
      return {
        start: startOfDay(today),
        end: endOfDay(today),
      };
    }

    if (view === 'week') {
      return {
        start: startOfWeek(today),
        end: endOfWeek(today),
      };
    }

    return {
      start: startOfMonth(today),
      end: endOfMonth(today),
    };
  }, [today, view]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.scheduledAt) {
        return view === 'day';
      }

      const scheduled = new Date(task.scheduledAt);

      if (Number.isNaN(scheduled.getTime())) {
        return view === 'day';
      }

      return (
        scheduled >= range.start &&
        scheduled < range.end
      );
    });
  }, [range.end, range.start, tasks, view]);

  const title =
    view === 'day'
      ? formatDate(today)
      : view === 'week'
        ? 'This week'
        : formatMonth(today);

  const viewLabels: Record<PlannerView, string> = {
    day: 'Day',
    week: 'Week',
    month: 'Month',
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{tr('planner')}</Text>
        <Text style={styles.subtitle}>{title}</Text>

        <View style={styles.tabs}>
          {(['day', 'week', 'month'] as PlannerView[]).map(
            (item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.tab,
                  view === item && styles.activeTab,
                ]}
                onPress={() => setView(item)}
              >
                <Text
                  style={[
                    styles.tabText,
                    view === item && styles.activeTabText,
                  ]}
                >
                  {viewLabels[item]}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>

        {visibleTasks.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>
              No tasks scheduled
            </Text>
            <Text style={styles.emptyText}>
              Add a task from the home screen to see it here.
            </Text>
          </Card>
        ) : (
          visibleTasks.map((task) => (
            <Card key={task.id}>
              <View style={styles.taskRow}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    task.done && styles.checkboxDone,
                  ]}
                  onPress={() => toggleTask(task.id)}
                >
                  {task.done ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : null}
                </TouchableOpacity>

                <View style={styles.taskInfo}>
                  <Text
                    style={[
                      styles.taskTitle,
                      task.done && styles.taskDone,
                    ]}
                  >
                    {task.title}
                  </Text>

                  <Text style={styles.taskTime}>
                    {task.time}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => deleteTask(task.id)}
                >
                  <Text style={styles.deleteText}>Delete</Text>
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
  safe: {
    flex: 1,
    backgroundColor: colors.soft,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
    fontSize: 15,
    color: colors.muted,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.purple,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  taskDone: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  taskTime: {
    marginTop: 3,
    fontSize: 13,
    color: colors.muted,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C2410C',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
});