import { describe, expect, it } from 'vitest';

import { formatRelativeTime, kindLabel } from '@/lib/dates';

describe('AI Meter copy helpers', () => {
  it('formats recent activity timestamps', () => {
    const now = new Date('2026-09-15T12:00:00');
    expect(formatRelativeTime('2026-09-15T10:00:00', now)).toBe('2h ago');
    expect(formatRelativeTime('2026-09-14T12:00:00', now)).toBe('yesterday');
  });

  it('labels generation types in English', () => {
    expect(kindLabel('notes')).toBe('Notes');
    expect(kindLabel('quiz')).toBe('Quiz');
  });
});
