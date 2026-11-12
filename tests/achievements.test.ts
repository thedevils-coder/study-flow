import { describe, expect, it } from 'vitest';

import { achievementsFromActivity } from '@/lib/achievements';
import type { FocusSession, StudyGoal } from '@/types';

const session = (id: string): FocusSession => ({
  id,
  userId: 'user',
  startedAt: `2026-09-0${id}T08:00:00`,
  endedAt: `2026-09-0${id}T08:25:00`,
  durationSeconds: 1500,
  sessionType: 'focus',
  createdAt: `2026-09-0${id}T08:25:00`,
});

describe('achievements', () => {
  it('stays locked with no activity', () => {
    const result = achievementsFromActivity({ sessions: [], goals: [] });
    expect(result.every((item) => !item.earned)).toBe(true);
  });

  it('unlocks first focus from a real session', () => {
    const result = achievementsFromActivity({ sessions: [session('1')], goals: [] });
    expect(result.find((item) => item.id === 'first_focus')?.earned).toBe(true);
    expect(result.find((item) => item.id === 'focus_master')?.earned).toBe(false);
  });

  it('unlocks goal crusher only when a goal is complete', () => {
    const goal: StudyGoal = {
      id: 'g1',
      userId: 'user',
      title: 'Finish Physics revision',
      targetValue: 10,
      currentValue: 10,
      unit: 'hours',
      dueAt: null,
      createdAt: '2026-09-01T00:00:00',
      updatedAt: '2026-09-15T00:00:00',
    };
    const result = achievementsFromActivity({ sessions: [], goals: [goal] });
    expect(result.find((item) => item.id === 'goal_crusher')?.earned).toBe(true);
  });
});
