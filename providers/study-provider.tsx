import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { addDays, startOfWeek } from '@/lib/dates';
import { summarizeProgress, type ProgressSummary } from '@/lib/progress';
import { achievementService } from '@/services/achievements';
import { aiService } from '@/services/ai';
import { focusService } from '@/services/focus';
import { focusTimer } from '@/services/focus-timer';
import { goalService } from '@/services/goals';
import { notificationService, settingsService } from '@/services/settings';
import { taskService } from '@/services/tasks';
import { testerService } from '@/services/tester';
import type {
  Achievement,
  AiActivity,
  FocusSession,
  StudyGoal,
  Task,
  UserSettings,
} from '@/types';
import { useAds } from '@/providers/ads-provider';
import { useAuth } from '@/providers/auth-provider';

type StudyContextValue = {
  tasks: Task[];
  goals: StudyGoal[];
  sessions: FocusSession[];
  previousWeekSessions: FocusSession[];
  achievements: Achievement[];
  aiActivity: AiActivity[];
  settings: UserSettings | null;
  progress: ProgressSummary;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTask: (title: string, scheduledAt: Date) => Promise<Task>;
  updateTask: (id: string, patch: { title?: string; scheduledAt?: Date | null; completed?: boolean }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  createGoal: (title: string, target: string, unit?: string, dueAt?: Date | null) => Promise<void>;
  updateGoal: (id: string, patch: { title?: string; currentValue?: number; targetValue?: number; unit?: string; dueAt?: Date | null }) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  saveSettings: (patch: Partial<UserSettings>) => Promise<void>;
  recordCompletedFocus: (startedAt: Date, durationSeconds: number) => Promise<void>;
  reloadAi: () => Promise<void>;
  resetTesterData: () => Promise<void>;
};

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { maybeShowInterstitial } = useAds();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [previousWeekSessions, setPreviousWeekSessions] = useState<FocusSession[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [aiActivity, setAiActivity] = useState<AiActivity[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setTasks([]);
      setGoals([]);
      setSessions([]);
      setPreviousWeekSessions([]);
      setAchievements([]);
      setAiActivity([]);
      setUserSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const weekStart = startOfWeek(new Date());
    const previousStart = addDays(weekStart, -7);
    const lookback = addDays(weekStart, -370);

    try {
      const [taskRows, goalRows, recent, previous, allFocus, settingsRow, activity] = await Promise.all([
        taskService.list(session.id),
        goalService.list(session.id),
        focusService.list(session.id, weekStart, addDays(weekStart, 7)),
        focusService.list(session.id, previousStart, weekStart),
        focusService.list(session.id, lookback, addDays(new Date(), 1)),
        settingsService.load(session.id),
        aiService.history(session.id, 30).catch(() => [] as AiActivity[]),
      ]);

      setTasks(taskRows);
      setGoals(goalRows);
      setSessions(allFocus);
      setPreviousWeekSessions(previous);
      setUserSettings(settingsRow);
      setAiActivity(activity);
      setAchievements(await achievementService.list(session.id, allFocus, goalRows));
      void recent;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load study data.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!session) {
      focusTimer.setOnComplete(null);
      return;
    }

    focusTimer.setOnComplete((startedAt, durationSeconds) => {
      void focusService
        .recordCompleted({
          userId: session.id,
          startedAt,
          durationSeconds,
          completedNaturally: true,
        })
        .then((saved) => {
          if (saved) {
            setSessions((current) => [saved, ...current]);
            maybeShowInterstitial();
          }
        });
    });

    return () => focusTimer.setOnComplete(null);
  }, [session, maybeShowInterstitial]);

  const progress = useMemo(
    () =>
      summarizeProgress({
        sessions,
        previousWeekSessions,
        tasks,
        activityDays: focusService.activityDays(sessions),
      }),
    [sessions, previousWeekSessions, tasks],
  );

  const value = useMemo<StudyContextValue>(
    () => ({
      tasks,
      goals,
      sessions,
      previousWeekSessions,
      achievements,
      aiActivity,
      settings: userSettings,
      progress,
      loading,
      error,
      refresh,

      async createTask(title, scheduledAt) {
        if (!session) throw new Error('Sign in to save tasks.');
        const saved = await taskService.create({
          userId: session.id,
          title,
          scheduledAt: scheduledAt.toISOString(),
        });
        setTasks((current) => [...current, saved]);
        if (userSettings?.notificationsEnabled && userSettings.taskReminders) {
          await notificationService.scheduleTaskReminder(saved.id, saved.title, scheduledAt);
        }
        return saved;
      },

      async updateTask(id, patch) {
        const saved = await taskService.update({
          id,
          title: patch.title,
          scheduledAt: patch.scheduledAt === undefined ? undefined : patch.scheduledAt?.toISOString() ?? null,
          completed: patch.completed,
        });
        setTasks((current) => current.map((task) => (task.id === id ? saved : task)));
      },

      async deleteTask(id) {
        await taskService.remove(id);
        await notificationService.cancelTaskReminder(id);
        setTasks((current) => current.filter((task) => task.id !== id));
      },

      async createGoal(title, target, unit, dueAt) {
        if (!session) throw new Error('Sign in to save goals.');
        const saved = await goalService.create({
          userId: session.id,
          title,
          target,
          unit,
          dueAt: dueAt?.toISOString() ?? null,
        });
        setGoals((current) => [saved, ...current]);
      },

      async updateGoal(id, patch) {
        const saved = await goalService.update({
          id,
          title: patch.title,
          currentValue: patch.currentValue,
          targetValue: patch.targetValue,
          unit: patch.unit,
          dueAt: patch.dueAt === undefined ? undefined : patch.dueAt?.toISOString() ?? null,
        });
        setGoals((current) => current.map((goal) => (goal.id === id ? saved : goal)));
      },

      async deleteGoal(id) {
        await goalService.remove(id);
        setGoals((current) => current.filter((goal) => goal.id !== id));
      },

      async saveSettings(patch) {
        if (!session) return;
        const saved = await settingsService.save(session.id, patch);
        setUserSettings(saved);
      },

      async recordCompletedFocus(startedAt, durationSeconds) {
        if (!session) return;
        const saved = await focusService.recordCompleted({
          userId: session.id,
          startedAt,
          durationSeconds,
          completedNaturally: true,
        });
        if (saved) setSessions((current) => [saved, ...current]);
      },

      async reloadAi() {
        if (!session) return;
        setAiActivity(await aiService.history(session.id, 30));
      },

      async resetTesterData() {
        if (!session) throw new Error('Sign in to reset tester data.');
        await testerService.reseed(session.id);
        await refresh();
      },
    }),
    [tasks, goals, sessions, previousWeekSessions, achievements, aiActivity, userSettings, progress, loading, error, refresh, session],
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() {
  const value = useContext(StudyContext);
  if (!value) throw new Error('StudyProvider is missing.');
  return value;
}
