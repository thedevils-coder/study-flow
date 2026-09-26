import type { ProposedTask, ScheduleDraft } from '@/types';

export function parseSchedule(text: string): ScheduleDraft {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    return {
      title: 'Proposed study plan',
      notes: text,
      tasks: [],
    };
  }

  try {
    const parsed = JSON.parse(match[0]) as Array<Record<string, unknown>>;
    const tasks: ProposedTask[] = parsed
      .map((item) => ({
        title: String(item.title ?? '').trim(),
        scheduledAt: String(item.scheduledAt ?? item.scheduled_at ?? ''),
        minutes: Number(item.minutes) || undefined,
        reason: item.reason ? String(item.reason) : undefined,
      }))
      .filter((item) => item.title && item.scheduledAt);

    return {
      title: 'Proposed study plan',
      notes: text.replace(match[0], '').trim(),
      tasks,
    };
  } catch {
    return {
      title: 'Proposed study plan',
      notes: text,
      tasks: [],
    };
  }
}
