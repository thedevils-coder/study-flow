import { describe, expect, it } from 'vitest';

import { achievementsFromActivity } from '@/lib/achievements';
import { dayKey } from '@/lib/dates';
import { summarizeProgress } from '@/lib/progress';
import {
  TESTER_EMAIL,
  applyTesterDemoAccess,
  isTesterBuildEnabled,
  isTesterEmail,
} from '@/lib/tester-core';
import { buildTesterSeed } from '@/lib/tester-seed';
import type { FocusSession, StudyGoal, Task, UserSession } from '@/types';

const now = new Date('2026-09-16T12:00:00');

const session = (overrides: Partial<UserSession> = {}): UserSession => ({
  id: 'tester-id',
  email: TESTER_EMAIL,
  name: 'Study Flow Tester',
  role: 'user',
  plan: 'none',
  subscriptionStatus: 'none',
  entitlements: [],
  ...overrides,
});

describe('tester account gating', () => {
  it('hides the tester flow on production builds', () => {
    expect(isTesterBuildEnabled({ testerAccountEnabled: false, isDev: true })).toBe(false);
    expect(isTesterBuildEnabled({ testerAccountEnabled: true })).toBe(true);
    expect(isTesterBuildEnabled({})).toBe(false);
  });

  it('recognizes the tester email', () => {
    expect(isTesterEmail('tester@getstudyflow.in')).toBe(true);
    expect(isTesterEmail('Tester@GetStudyFlow.in')).toBe(true);
    expect(isTesterEmail('student@getstudyflow.in')).toBe(false);
  });

  it('applies labeled demo Pro access only for the tester on tester builds', () => {
    const demo = applyTesterDemoAccess(session(), now, true);
    expect(demo.plan).toBe('pro');
    expect(demo.subscriptionStatus).toBe('active');
    expect(demo.productId).toBe('tester_demo_pro');
    expect(demo.entitlements).toEqual(['pro']);

    const production = applyTesterDemoAccess(session(), now, false);
    expect(production.plan).toBe('none');

    const otherUser = applyTesterDemoAccess(session({ email: 'ada@getstudyflow.in' }), now, true);
    expect(otherUser.plan).toBe('none');

    const paid = applyTesterDemoAccess(
      session({ plan: 'pro', subscriptionStatus: 'active', entitlements: ['pro'] }),
      now,
      true,
    );
    expect(paid.plan).toBe('pro');
  });
});

describe('tester sample data', () => {
  it('creates realistic tasks, goals, sessions, and AI history', () => {
    const seed = buildTesterSeed(now);
    expect(seed.displayName).toBe('Study Flow Tester');
    expect(seed.tasks.length).toBeGreaterThanOrEqual(8);
    expect(seed.tasks.some((task) => task.completedAt)).toBe(true);
    expect(seed.tasks.some((task) => !task.completedAt)).toBe(true);
    expect(seed.goals.some((goal) => goal.currentValue >= goal.targetValue)).toBe(true);
    expect(seed.sessions.length).toBeGreaterThanOrEqual(8);
    expect(new Set(seed.sessions.map((item) => item.startedAt)).size).toBe(seed.sessions.length);
    expect(seed.ai.map((item) => item.kind)).toEqual(
      expect.arrayContaining(['notes', 'summary', 'leo', 'schedule', 'flashcards']),
    );
  });

  it('unlocks some achievements while leaving Focus Master locked', () => {
    const seed = buildTesterSeed(now);
    const sessions: FocusSession[] = seed.sessions.map((item, index) => ({
      id: `s${index}`,
      userId: 'tester-id',
      startedAt: item.startedAt,
      endedAt: item.endedAt,
      durationSeconds: item.durationSeconds,
      sessionType: item.sessionType,
      createdAt: item.startedAt,
    }));
    const goals: StudyGoal[] = seed.goals.map((item, index) => ({
      id: `g${index}`,
      userId: 'tester-id',
      title: item.title,
      targetValue: item.targetValue,
      currentValue: item.currentValue,
      unit: item.unit,
      dueAt: item.dueAt,
      createdAt: item.dueAt,
      updatedAt: item.dueAt,
    }));

    const achievements = achievementsFromActivity({ sessions, goals });
    const earned = Object.fromEntries(achievements.map((item) => [item.id, item.earned]));
    expect(earned.first_focus).toBe(true);
    expect(earned.study_starter).toBe(true);
    expect(earned.consistent).toBe(true);
    expect(earned.goal_crusher).toBe(true);
    expect(earned.focus_master).toBe(false);
  });

  it('produces Home/Progress stats from the sample sessions', () => {
    const seed = buildTesterSeed(now);
    const sessions: FocusSession[] = seed.sessions.map((item, index) => ({
      id: `s${index}`,
      userId: 'tester-id',
      startedAt: item.startedAt,
      endedAt: item.endedAt,
      durationSeconds: item.durationSeconds,
      sessionType: item.sessionType,
      createdAt: item.startedAt,
    }));
    const tasks: Task[] = seed.tasks.map((item, index) => ({
      id: `t${index}`,
      userId: 'tester-id',
      title: item.title,
      completed: Boolean(item.completedAt),
      scheduledAt: item.scheduledAt,
      category: item.category,
      createdAt: item.scheduledAt,
      updatedAt: item.completedAt ?? item.scheduledAt,
    }));

    const summary = summarizeProgress({
      sessions,
      previousWeekSessions: [],
      tasks,
      activityDays: Array.from(new Set(sessions.map((item) => dayKey(new Date(item.startedAt))))),
      now,
    });

    expect(summary.todaySeconds).toBeGreaterThan(0);
    expect(summary.todayCompletedTasks).toBeGreaterThan(0);
    expect(summary.currentStreak).toBeGreaterThanOrEqual(5);
    expect(summary.weekSeconds).toBeGreaterThan(0);
  });
});

describe('supabase URL and tester errors', () => {
  it('strips a REST suffix from the project URL', async () => {
    const { normalizeSupabaseUrl } = await import('@/lib/supabase-url');
    expect(normalizeSupabaseUrl('https://example.supabase.co/rest/v1/')).toBe('https://example.supabase.co');
    expect(normalizeSupabaseUrl('https://example.supabase.co/')).toBe('https://example.supabase.co');
  });

  it('surfaces PostgREST objects instead of a generic tester fallback', async () => {
    const { userFacingError, isMissingRelationError } = await import('@/lib/errors');
    const pathError = { code: 'PGRST125', message: 'Invalid path specified in request URL' };
    expect(userFacingError(pathError, 'Unable to open the tester profile.')).toBe(
      'Invalid path specified in request URL — PGRST125',
    );
    expect(
      isMissingRelationError({
        code: '42P01',
        message: 'relation "public.study_goals" does not exist',
      }),
    ).toBe(true);
  });
});
