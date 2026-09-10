export const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const endOfDay = (date: Date) => {
  const result = startOfDay(date);
  result.setDate(result.getDate() + 1);
  return result;
};

export const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const startOfWeek = (date: Date) => {
  const result = startOfDay(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
};

export const endOfWeek = (date: Date) => {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 7);
  return result;
};

export const startOfMonth = (date: Date) => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const endOfMonth = (date: Date) => {
  const result = startOfMonth(date);
  result.setMonth(result.getMonth() + 1);
  return result;
};

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

export const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${remainingMinutes}m`;
};

export const combineDateAndTime = (date: Date, hours: number, minutes: number) => {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

export const isSameDay = (left: Date, right: Date) =>
  dayKey(left) === dayKey(right);

export const isOverdue = (scheduledAt: string | null | undefined, done: boolean) => {
  if (done || !scheduledAt) {
    return false;
  }

  const scheduled = new Date(scheduledAt);

  if (Number.isNaN(scheduled.getTime())) {
    return false;
  }

  return scheduled < new Date();
};
