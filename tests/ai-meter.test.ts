import { describe, expect, it } from 'vitest';

import { formatRelativeTime, kindLabel } from '@/lib/dates';
import { startOfUtcDay, summarizeDailyUsage } from '@/lib/ai-usage';

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

  it('counts daily usage with UTC midnight, not the device timezone', () => {
    const now = new Date('2026-11-12T01:30:00.000Z');
    const start = startOfUtcDay(now);
    expect(start.toISOString()).toBe('2026-11-12T00:00:00.000Z');
    const usage = summarizeDailyUsage(
      [
        { createdAt: '2026-11-11T23:59:00.000Z' },
        { createdAt: '2026-11-12T00:01:00.000Z' },
      ],
      20,
      now,
    );
    expect(usage.used).toBe(1);
    expect(usage.remaining).toBe(19);
    expect(usage.limit).toBe(20);
  });
});

