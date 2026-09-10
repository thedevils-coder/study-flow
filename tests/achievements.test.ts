import { describe, expect, it } from 'vitest';
import { achievementsFromActivity, achievementLabelKey } from '@/services/achievements';
import { resolveLanguage } from '@/i18n';

describe('achievements', () => {
  it('does not invent earned badges without activity', () => {
    expect(
      achievementsFromActivity({
        sessionCount: 0,
        focusSeconds: 0,
        tasks: [],
        goals: [],
        currentStreak: 0,
      }).every((item) => !item.earned),
    ).toBe(true);
  });

  it('earns first focus and study hours from real totals', () => {
    const result = achievementsFromActivity({
      sessionCount: 2,
      focusSeconds: 5 * 3600,
      tasks: [{ id: '1', title: 'A', time: '', done: true, category: 'study' }],
      goals: [
        {
          id: 'g',
          title: 'Exam',
          targetValue: 10,
          currentValue: 10,
          unit: 'hours',
          dueAt: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
      currentStreak: 3,
    });
    expect(result.find((item) => item.id === 'first_focus')?.earned).toBe(true);
    expect(result.find((item) => item.id === 'study_5h')?.earned).toBe(true);
    expect(result.find((item) => item.id === 'streak_3')?.earned).toBe(true);
    expect(result.find((item) => item.id === 'goal_complete')?.earned).toBe(true);
    expect(achievementLabelKey('first_focus')).toBe('firstFocus');
  });
});

describe('language resolution', () => {
  it('maps device locales onto supported languages', () => {
    expect(resolveLanguage('hi-IN')).toBe('hi');
    expect(resolveLanguage('pt-BR')).toBe('pt');
    expect(resolveLanguage('xx-ZZ')).toBe('en');
  });
});
