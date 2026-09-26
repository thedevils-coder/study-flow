import { describe, expect, it } from 'vitest';

import { calculateStreak } from '@/lib/streak';
import { percentChange, summarizeProgress } from '@/lib/progress';
import type { FocusSession, Task } from '@/types';

const session = (startedAt: string, seconds: number): FocusSession => ({
  id: startedAt,
  userId: 'user',
  startedAt,
  endedAt: startedAt,
  durationSeconds: seconds,
  sessionType: 'focus',
  createdAt: startedAt,
});

describe('progress', () => {
  it('calculates a current streak from consecutive days', () => {
    const now = new Date('2026-09-15T12:00:00');
    const result = calculateStreak(['2026-09-13', '2026-09-14', '2026-09-15'], now);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it('does not invent a 7-day streak', () => {
    const now = new Date('2026-09-15T12:00:00');
    expect(calculateStreak(['2026-09-15'], now).current).toBe(1);
  });

  it('compares weekly study totals', () => {
    expect(percentChange(50, 40)).toBe(25);
    expect(percentChange(0, 0)).toBe(0);
  });

  it('summarizes real session and task data', () => {
    const now = new Date('2026-09-15T12:00:00');
    const summary = summarizeProgress({
      now,
      sessions: [
        session('2026-09-15T08:00:00', 1500),
        session('2026-09-14T08:00:00', 1500),
      ],
      previousWeekSessions: [session('2026-09-07T08:00:00', 1200)],
      activityDays: ['2026-09-14', '2026-09-15'],
      tasks: [
        {
          id: '1',
          userId: 'user',
          title: 'Read',
          completed: true,
          scheduledAt: '2026-09-15T09:00:00',
          category: 'study',
          createdAt: '2026-09-15T09:00:00',
          updatedAt: '2026-09-15T10:00:00',
        } satisfies Task,
      ],
    });

    expect(summary.todaySeconds).toBe(1500);
    expect(summary.todaySessions).toBe(1);
    expect(summary.currentStreak).toBe(2);
    expect(summary.insights.length).toBeGreaterThan(0);
  });
});
