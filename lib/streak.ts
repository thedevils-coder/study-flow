import { addDays, dayKey, startOfDay } from '@/lib/dates';

export type StreakResult = {
  current: number;
  longest: number;
};

export function calculateStreak(activityDays: string[], now = new Date()): StreakResult {
  const days = new Set(activityDays.filter(Boolean));

  if (days.size === 0) {
    return { current: 0, longest: 0 };
  }

  const today = startOfDay(now);
  const todayKey = dayKey(today);
  const yesterdayKey = dayKey(addDays(today, -1));

  let current = 0;
  let cursor = today;

  if (days.has(todayKey)) {
    cursor = today;
  } else if (days.has(yesterdayKey)) {
    cursor = addDays(today, -1);
  } else {
    cursor = today;
  }

  if (days.has(dayKey(cursor))) {
    while (days.has(dayKey(cursor))) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  const sorted = Array.from(days).sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;

  for (const key of sorted) {
    if (!previous) {
      run = 1;
    } else {
      const previousDate = new Date(`${previous}T00:00:00`);
      const currentDate = new Date(`${key}T00:00:00`);
      const diff = Math.round((currentDate.getTime() - previousDate.getTime()) / 86_400_000);
      run = diff === 1 ? run + 1 : 1;
    }

    longest = Math.max(longest, run);
    previous = key;
  }

  return { current, longest };
}
