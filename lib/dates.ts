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

export const endOfWeek = (date: Date) => addDays(startOfWeek(date), 7);

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

export const combineDateAndTime = (date: Date, time: Date) => {
  const result = new Date(date);
  result.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return result;
};

export const toHtmlDateValue = (date: Date) => dayKey(date);

export const toHtmlTimeValue = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export function applyHtmlDateValue(current: Date | null | undefined, value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return current ? new Date(current) : new Date();
  const next = current ? new Date(current) : new Date();
  next.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return next;
}

export function applyHtmlTimeValue(current: Date | null | undefined, value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return current ? new Date(current) : new Date();
  const next = current ? new Date(current) : new Date();
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return next;
}

export function htmlValueFromChangeEvent(event: unknown): string {
  if (typeof event === 'string') return event;
  if (!event || typeof event !== 'object') return '';
  const record = event as { target?: { value?: unknown }; nativeEvent?: { text?: unknown; target?: { value?: unknown } } };
  const fromTarget = record.target?.value;
  if (typeof fromTarget === 'string') return fromTarget;
  const fromNative = record.nativeEvent?.text ?? record.nativeEvent?.target?.value;
  return typeof fromNative === 'string' ? fromNative : '';
}

export const usesHtmlDateTimePicker = (os: string) => os === 'web';

export const isSameDay = (left: Date, right: Date) => dayKey(left) === dayKey(right);

export const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  return `${remainingMinutes}m`;
};

export const formatClock = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);

export const formatShortDate = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);

export const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);

export const formatTime = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

export const greetingFor = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export function formatRelativeTime(iso: string, now = new Date()) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const diff = Math.max(0, now.getTime() - then.getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1h ago' : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatShortDate(then);
}

export function kindLabel(kind: string) {
  switch (kind) {
    case 'notes':
      return 'Notes';
    case 'summary':
      return 'Summary';
    case 'flashcards':
      return 'Flashcards';
    case 'quiz':
      return 'Quiz';
    case 'explain':
      return 'Explain';
    case 'leo':
      return 'Leo';
    case 'schedule':
      return 'Schedule';
    default:
      return 'More';
  }
}
