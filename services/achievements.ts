import { Achievement, AchievementId, FocusSession, Task } from '@/types';
import { StudyGoal } from '@/services/study-data';

const ids: AchievementId[] = [
  'first_focus',
  'streak_3',
  'streak_7',
  'tasks_10',
  'goal_complete',
  'study_5h',
];

export function achievementsFromActivity(input: {
  sessions?: FocusSession[];
  sessionCount?: number;
  focusSeconds?: number;
  tasks: Task[];
  goals: StudyGoal[];
  currentStreak: number;
}): Achievement[] {
  const sessionCount = input.sessionCount ?? input.sessions?.length ?? 0;
  const focusSeconds =
    input.focusSeconds ??
    input.sessions?.reduce((total, session) => total + session.duration_seconds, 0) ??
    0;
  const completedTasks = input.tasks.filter((task) => task.done).length;
  const completedGoal = input.goals.some(
    (goal) => goal.targetValue > 0 && goal.currentValue >= goal.targetValue,
  );

  const earned: Record<AchievementId, boolean> = {
    first_focus: sessionCount > 0,
    streak_3: input.currentStreak >= 3,
    streak_7: input.currentStreak >= 7,
    tasks_10: completedTasks >= 10,
    goal_complete: completedGoal,
    study_5h: focusSeconds >= 5 * 3600,
  };

  return ids.map((id) => ({ id, earned: earned[id] }));
}

export function achievementLabelKey(id: AchievementId) {
  switch (id) {
    case 'first_focus':
      return 'firstFocus';
    case 'streak_3':
      return 'streak3';
    case 'streak_7':
      return 'streak7';
    case 'tasks_10':
      return 'tasks10';
    case 'goal_complete':
      return 'goalComplete';
    case 'study_5h':
      return 'study5h';
  }
}
