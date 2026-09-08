import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui';
import { colors } from '@/constants/theme';
import { studyData } from '@/services/study-data';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';

type FocusSession = {
  started_at: string;
  ended_at: string;
  duration_seconds: number;
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${remainingMinutes}m`;
};

const dayLabel = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'narrow',
  }).format(date);

export default function Progress() {
  const { session, tasks, goals } = useApp();

  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [previousWeekSessions, setPreviousWeekSessions] = useState<
    FocusSession[]
  >([]);
  const [streakDays, setStreakDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [streakLoading, setStreakLoading] = useState(true);

  const tr = (key: string) => t(session!.language, key);

  const weekStart = useMemo(() => {
    return startOfWeek(new Date());
  }, []);

  const weekEnd = useMemo(() => {
    return addDays(weekStart, 7);
  }, [weekStart]);

  const previousWeekStart = useMemo(() => {
    return addDays(weekStart, -7);
  }, [weekStart]);

  const previousWeekEnd = useMemo(() => {
    return weekStart;
  }, [weekStart]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!session) {
        setLoading(false);
        setStreakLoading(false);
        return;
      }

      setLoading(true);
      setStreakLoading(true);

      const today = startOfDay(new Date());
      const streakStart = addDays(today, -365);
      const streakEnd = addDays(today, 1);

      try {
        const [weeklyData, previousWeeklyData, days] = await Promise.all([
          studyData.focusSessions(
            session.id,
            weekStart,
            weekEnd,
          ),
          studyData.focusSessions(
            session.id,
            previousWeekStart,
            previousWeekEnd,
          ),
          studyData.focusDays(
            session.id,
            streakStart,
            streakEnd,
          ),
        ]);

        if (active) {
          setSessions(weeklyData);
          setPreviousWeekSessions(previousWeeklyData);
          setStreakDays(days);
        }
      } catch {
        if (active) {
          setSessions([]);
          setPreviousWeekSessions([]);
          setStreakDays([]);
        }
      } finally {
        if (active) {
          setLoading(false);
          setStreakLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [
    session,
    weekStart,
    weekEnd,
    previousWeekStart,
    previousWeekEnd,
  ]);

  const weeklySeconds = sessions.reduce(
    (total, item) => total + item.duration_seconds,
    0,
  );

  const previousWeeklySeconds = previousWeekSessions.reduce(
    (total, item) => total + item.duration_seconds,
    0,
  );

  const weeklyChangePercent =
    previousWeeklySeconds === 0
      ? weeklySeconds > 0
        ? 100
        : 0
      : Math.round(
          ((weeklySeconds - previousWeeklySeconds) /
            previousWeeklySeconds) *
            100,
        );

  const completedTasks = tasks.filter((task) => task.done).length;

  const averageSessionSeconds =
    sessions.length > 0
      ? Math.round(weeklySeconds / sessions.length)
      : 0;

  const currentStreak = useMemo(() => {
    if (streakDays.length === 0) {
      return 0;
    }

    const days = new Set(streakDays);

    const today = startOfDay(new Date());
    const todayKey = dayKey(today);
    const yesterdayKey = dayKey(addDays(today, -1));

    let cursor: Date;

    if (days.has(todayKey)) {
      cursor = today;
    } else if (days.has(yesterdayKey)) {
      cursor = addDays(today, -1);
    } else {
      return 0;
    }

    let count = 0;

    while (days.has(dayKey(cursor))) {
      count += 1;
      cursor = addDays(cursor, -1);
    }

    return count;
  }, [streakDays]);

  const chart = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const dayStart = addDays(weekStart, index);
      const dayEnd = addDays(dayStart, 1);

      const seconds = sessions
        .filter((item) => {
          const started = new Date(item.started_at);

          return started >= dayStart && started < dayEnd;
        })
        .reduce(
          (total, item) => total + item.duration_seconds,
          0,
        );

      return {
        seconds,
        label: dayLabel(dayStart),
        index,
      };
    });
  }, [sessions, weekStart]);

  const maxSeconds = Math.max(
    ...chart.map((item) => item.seconds),
    1,
  );

  const activeGoals = useMemo(() => {
    return goals
      .filter((goal) => goal.targetValue > 0)
      .sort((a, b) => {
        const aProgress =
          a.currentValue / a.targetValue;
        const bProgress =
          b.currentValue / b.targetValue;

        return bProgress - aProgress;
      })
      .slice(0, 3);
  }, [goals]);

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>{tr('progress')}</Text>

        <Text style={s.week}>This week</Text>

        <Card style={s.hero}>
          <Text style={s.muted}>{tr('studyTime')}</Text>

          {loading ? (
            <ActivityIndicator
              size="small"
              color={colors.purple}
              style={s.loader}
            />
          ) : (
            <>
              <Text style={s.time}>
                {formatDuration(weeklySeconds)}
              </Text>

              <Text style={s.good}>
                {sessions.length === 0
                  ? 'No focus sessions yet'
                  : `${weeklyChangePercent >= 0 ? 'Up' : 'Down'} ${Math.abs(
                      weeklyChangePercent,
                    )}% from last week`}
              </Text>
            </>
          )}

          <View style={s.chart}>
            {chart.map((item) => {
              const height =
                item.seconds === 0
                  ? 4
                  : Math.max(
                      8,
                      (item.seconds / maxSeconds) * 130,
                    );

              return (
                <View
                  key={item.index}
                  style={s.chartItem}
                >
                  <View
                    style={[
                      s.bar,
                      {
                        height,
                      },
                    ]}
                  />

                  <Text style={s.day}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        <View style={s.grid}>
          <Card style={s.small}>
            <Text style={s.muted}>
              {tr('tasksCompleted')}
            </Text>

            <Text style={s.metric}>
              {completedTasks}
            </Text>
          </Card>

          <Card style={s.small}>
            <Text style={s.muted}>
              {tr('currentStreak')}
            </Text>

            {streakLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.purple}
                style={s.streakLoader}
              />
            ) : (
              <Text style={s.metric}>
                {currentStreak}
              </Text>
            )}
          </Card>
        </View>

        {activeGoals.length > 0 && (
          <Card style={s.goalsCard}>
            <Text style={s.section}>Goals</Text>

            {activeGoals.map((goal) => {
              const progress = Math.min(
                goal.currentValue / goal.targetValue,
                1,
              );

              const percent = Math.round(
                progress * 100,
              );

              return (
                <View
                  key={goal.id}
                  style={s.goalRow}
                >
                  <View style={s.goalHeader}>
                    <Text style={s.goalTitle}>
                      {goal.title}
                    </Text>

                    <Text style={s.goalPercent}>
                      {percent}%
                    </Text>
                  </View>

                  <View style={s.goalTrack}>
                    <View
                      style={[
                        s.goalFill,
                        {
                          width: `${percent}%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={s.goalMeta}>
                    {goal.currentValue} / {goal.targetValue}{' '}
                    {goal.unit}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        <Card>
          <Text style={s.section}>
            Insights that matter
          </Text>

          <Text style={s.insight}>
            {formatDuration(weeklySeconds)} of focus
            time this week
          </Text>

          <Text style={s.insight}>
            {completedTasks} task
            {completedTasks === 1 ? '' : 's'} completed
          </Text>

          <Text style={s.insight}>
            {sessions.length === 0
              ? 'No focus sessions yet'
              : `${sessions.length} focus session${
                  sessions.length === 1 ? '' : 's'
                }, averaging ${formatDuration(
                  averageSessionSeconds,
                )} each`}
          </Text>

          <Text style={s.insight}>
            {currentStreak} day
            {currentStreak === 1 ? '' : 's'} current
            focus streak
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: 'white',
  },

  scroll: {
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.ink,
  },

  week: {
    alignSelf: 'center',
    backgroundColor: colors.soft,
    padding: 10,
    borderRadius: 15,
    margin: 18,
  },

  hero: {
    backgroundColor: colors.soft,
  },

  muted: {
    color: colors.muted,
    fontWeight: '600',
  },

  loader: {
    marginTop: 15,
    alignSelf: 'flex-start',
  },

  streakLoader: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },

  time: {
    fontSize: 29,
    fontWeight: '900',
    color: colors.ink,
    marginTop: 5,
  },

  good: {
    color: colors.success,
    fontSize: 12,
    marginTop: 4,
  },

  chart: {
    height: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginTop: 16,
  },

  chartItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    height: 150,
  },

  bar: {
    width: 16,
    backgroundColor: colors.purple,
    borderRadius: 5,
  },

  day: {
    fontSize: 10,
    color: colors.muted,
  },

  grid: {
    flexDirection: 'row',
    gap: 12,
  },

  small: {
    flex: 1,
  },

  metric: {
    fontSize: 25,
    fontWeight: '900',
    marginTop: 6,
    color: colors.ink,
  },

  goalsCard: {
    marginTop: 12,
  },

  goalRow: {
    marginTop: 16,
  },

  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  goalTitle: {
    flex: 1,
    fontWeight: '800',
    color: colors.ink,
  },

  goalPercent: {
    fontWeight: '900',
    color: colors.purple,
  },

  goalTrack: {
    height: 8,
    backgroundColor: colors.soft,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },

  goalFill: {
    height: '100%',
    backgroundColor: colors.purple,
    borderRadius: 8,
  },

  goalMeta: {
    marginTop: 5,
    fontSize: 12,
    color: colors.muted,
  },

  section: {
    fontWeight: '900',
    fontSize: 17,
    color: colors.ink,
  },

  insight: {
    marginTop: 15,
    color: colors.ink,
  },
});