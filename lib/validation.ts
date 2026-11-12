export function validateTaskTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    return { ok: false as const, error: 'Enter a task title.' };
  }
  if (trimmed.length > 160) {
    return { ok: false as const, error: 'Task titles can be up to 160 characters.' };
  }
  return { ok: true as const, title: trimmed };
}

export function validateGoalInput(title: string, target: string, unit: string) {
  const cleanTitle = title.trim();
  const cleanUnit = unit.trim() || 'hours';
  const targetValue = Number(target);

  if (!cleanTitle) {
    return { ok: false as const, error: 'Enter a goal title.' };
  }
  if (cleanTitle.length > 160) {
    return { ok: false as const, error: 'Goal titles can be up to 160 characters.' };
  }
  if (!Number.isInteger(targetValue) || targetValue < 1) {
    return { ok: false as const, error: 'Enter a positive whole-number target.' };
  }
  return { ok: true as const, title: cleanTitle, targetValue, unit: cleanUnit };
}

export function clampGoalProgress(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

export function shouldRecordFocusSession(input: {
  completedNaturally: boolean;
  reset: boolean;
  alreadyRecorded: boolean;
  durationSeconds: number;
}) {
  if (input.reset || input.alreadyRecorded || !input.completedNaturally) {
    return false;
  }
  return input.durationSeconds > 0;
}
