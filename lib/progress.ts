import { addDays, dayKey, formatDuration, startOfDay, startOfWeek } from '@/lib/dates';
import { calculateStreak } from '@/lib/streak';
import type { FocusSession, StudyGoal, Task } from '@/types';

export type DayStudyPoint = {
  key: string;
  label: string;
  seconds: number;
};

export type ProgressSummary = {
  todaySeconds: number;
  todayCompletedTasks: number;
  todaySessions: number;
  weekSeconds: number;
  previousWeekSeconds: number;
  weekChangePercent: number;
  weekSessions: number;
  weekCompletedTasks: number;
  studyDaysThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  averageSessionSeconds: number;
  chart: DayStudyPoint[];
  insights: string[];
};

const weekdayLabel = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);

const weekdayNarrow = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(date);

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function summarizeProgress(input: {
  sessions: FocusSession[];
  previousWeekSessions: FocusSession[];
  tasks: Task[];
  activityDays: string[];
  now?: Date;
}): ProgressSummary {
  const now = input.now ?? new Date();
  const todayStart = startOfDay(now);
  const tomorrow = addDays(todayStart, 1);
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);

  const inRange = (iso: string, start: Date, end: Date) => {
    const value = new Date(iso);
    return value >= start && value < end;
  };

  const todaySessions = input.sessions.filter((session) =>
    inRange(session.startedAt, todayStart, tomorrow),
  );
  const weekSessions = input.sessions.filter((session) =>
    inRange(session.startedAt, weekStart, weekEnd),
  );

  const todaySeconds = todaySessions.reduce((total, session) => total + session.durationSeconds, 0);
  const weekSeconds = weekSessions.reduce((total, session) => total + session.durationSeconds, 0);
  const previousWeekSeconds = input.previousWeekSessions.reduce(
    (total, session) => total + session.durationSeconds,
    0,
  );

  const todayCompletedTasks = input.tasks.filter((task) => {
    if (!task.completed) return false;
    const completedAt = new Date(task.updatedAt);
    return completedAt >= todayStart && completedAt < tomorrow;
  }).length;

  const weekCompletedTasks = input.tasks.filter((task) => {
    if (!task.completed) return false;
    const completedAt = new Date(task.updatedAt);
    return completedAt >= weekStart && completedAt < weekEnd;
  }).length;

  const chart = Array.from({ length: 7 }, (_, index) => {
    const dayStart = addDays(weekStart, index);
    const dayEnd = addDays(dayStart, 1);
    const seconds = weekSessions
      .filter((session) => inRange(session.startedAt, dayStart, dayEnd))
      .reduce((total, session) => total + session.durationSeconds, 0);

    return {
      key: dayKey(dayStart),
      label: weekdayNarrow(dayStart),
      seconds,
    };
  });

  const studyDaysThisWeek = chart.filter((item) => item.seconds > 0).length;
  const streak = calculateStreak(input.activityDays, now);
  const averageSessionSeconds =
    weekSessions.length > 0 ? Math.round(weekSeconds / weekSessions.length) : 0;

  return {
    todaySeconds,
    todayCompletedTasks,
    todaySessions: todaySessions.length,
    weekSeconds,
    previousWeekSeconds,
    weekChangePercent: percentChange(weekSeconds, previousWeekSeconds),
    weekSessions: weekSessions.length,
    weekCompletedTasks,
    studyDaysThisWeek,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    averageSessionSeconds,
    chart,
    insights: buildInsights({
      weekSeconds,
      previousWeekSeconds,
      weekSessions: weekSessions.length,
      chart,
      weekStart,
      currentStreak: streak.current,
    }),
  };
}

export function buildInsights(input: {
  weekSeconds: number;
  previousWeekSeconds: number;
  weekSessions: number;
  chart: DayStudyPoint[];
  weekStart: Date;
  currentStreak: number;
}) {
  const insights: string[] = [];
  const change = percentChange(input.weekSeconds, input.previousWeekSeconds);

  if (input.weekSeconds === 0 && input.weekSessions === 0) {
    insights.push('No focus sessions yet this week. Start a 25-minute session to begin tracking.');
    return insights;
  }

  if (input.previousWeekSeconds === 0 && input.weekSeconds > 0) {
    insights.push(`You logged ${formatDuration(input.weekSeconds)} of study time this week.`);
  } else if (change > 0) {
    insights.push(`You studied ${change}% more this week than last week.`);
  } else if (change < 0) {
    insights.push(`Study time is ${Math.abs(change)}% lower than last week.`);
  } else {
    insights.push('Your study time this week matches last week.');
  }

  const top = [...input.chart].sort((a, b) => b.seconds - a.seconds)[0];
  if (top && top.seconds > 0) {
    const index = input.chart.findIndex((item) => item.key === top.key);
    const day = weekdayLabel(addDays(input.weekStart, index));
    insights.push(`Your most productive day was ${day}.`);
  }

  insights.push(
    `You completed ${input.weekSessions} focus session${input.weekSessions === 1 ? '' : 's'} this week.`,
  );

  if (input.currentStreak > 0) {
    insights.push(`Your current study streak is ${input.currentStreak} day${input.currentStreak === 1 ? '' : 's'}.`);
  }

  return insights;
}

export function goalPercent(goal: StudyGoal) {
  if (goal.targetValue <= 0) return 0;
  return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
}
