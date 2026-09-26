import { describe, expect, it } from 'vitest';

import { validateGoalInput, validateTaskTitle, shouldRecordFocusSession, clampGoalProgress } from '@/lib/validation';

describe('tasks', () => {
  it('rejects empty titles', () => {
    expect(validateTaskTitle('   ').ok).toBe(false);
  });

  it('accepts a real title', () => {
    const result = validateTaskTitle(' Read chapter 4 ');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.title).toBe('Read chapter 4');
  });
});

describe('goals', () => {
  it('creates a valid goal payload', () => {
    const result = validateGoalInput('Study 20 hours', '20', 'hours');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.targetValue).toBe(20);
      expect(result.unit).toBe('hours');
    }
  });

  it('rejects invalid targets', () => {
    expect(validateGoalInput('Study', '0', 'hours').ok).toBe(false);
  });

  it('clamps progress', () => {
    expect(clampGoalProgress(-4)).toBe(0);
    expect(clampGoalProgress(3.9)).toBe(3);
  });
});

describe('focus', () => {
  it('records a naturally completed session once', () => {
    expect(
      shouldRecordFocusSession({
        completedNaturally: true,
        reset: false,
        alreadyRecorded: false,
        durationSeconds: 1500,
      }),
    ).toBe(true);
  });

  it('does not record a reset', () => {
    expect(
      shouldRecordFocusSession({
        completedNaturally: true,
        reset: true,
        alreadyRecorded: false,
        durationSeconds: 1500,
      }),
    ).toBe(false);
  });

  it('prevents duplicate recording', () => {
    expect(
      shouldRecordFocusSession({
        completedNaturally: true,
        reset: false,
        alreadyRecorded: true,
        durationSeconds: 1500,
      }),
    ).toBe(false);
  });
});
