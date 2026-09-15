import { describe, expect, it } from 'vitest';

import { parseSchedule } from '@/lib/schedule';

describe('AI schedule parsing', () => {
  it('does not invent tasks when the model returns prose', () => {
    const draft = parseSchedule('Try studying physics first.');
    expect(draft.tasks).toEqual([]);
  });

  it('parses a JSON preview without applying it', () => {
    const draft = parseSchedule(
      'Here is a plan:\n[{"title":"Physics","scheduledAt":"2026-09-16T18:00:00.000Z","minutes":25}]',
    );
    expect(draft.tasks).toHaveLength(1);
    expect(draft.tasks[0]?.title).toBe('Physics');
  });
});
