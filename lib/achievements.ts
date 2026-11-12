import type { Achievement, AchievementId, FocusSession, StudyGoal } from '@/types';
import { dayKey } from '@/lib/dates';

export const ACHIEVEMENT_CATALOG: Array<{
  id: AchievementId;
  title: string;
  description: string;
}> = [
  {
    id: 'first_focus',
    title: 'First Focus',
    description: 'Complete your first focus session.',
  },
  {
    id: 'study_starter',
    title: 'Study Starter',
    description: 'Study for 5 hours.',
  },
  {
    id: 'consistent',
    title: 'Consistent',
    description: 'Study on 5 different days.',
  },
  {
    id: 'focus_master',
    title: 'Focus Master',
    description: 'Complete 25 focus sessions.',
  },
  {
    id: 'goal_crusher',
    title: 'Goal Crusher',
    description: 'Complete a goal.',
  },
];

export function achievementsFromActivity(input: {
  sessions: FocusSession[];
  goals: StudyGoal[];
  earned?: Partial<Record<AchievementId, string>>;
}): Achievement[] {
  const totalSeconds = input.sessions.reduce((total, session) => total + session.durationSeconds, 0);
  const uniqueDays = new Set(input.sessions.map((session) => dayKey(new Date(session.startedAt))));
  const completedGoal = input.goals.some(
    (goal) => goal.targetValue > 0 && goal.currentValue >= goal.targetValue,
  );

  const unlocked: Record<AchievementId, boolean> = {
    first_focus: input.sessions.length > 0,
    study_starter: totalSeconds >= 5 * 3600,
    consistent: uniqueDays.size >= 5,
    focus_master: input.sessions.length >= 25,
    goal_crusher: completedGoal,
  };

  return ACHIEVEMENT_CATALOG.map((item) => ({
    ...item,
    earned: unlocked[item.id],
    earnedAt: input.earned?.[item.id] ?? null,
  }));
}
