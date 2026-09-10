import { en, CopyKey } from '@/i18n/en';
import { translations } from '@/i18n/translations';
import { additions } from '@/i18n/additions';

export const languages = [
  ['en', 'English'],
  ['hi', 'हिन्दी'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
  ['pt', 'Português'],
  ['ar', 'العربية'],
  ['zh', '中文'],
  ['ja', '日本語'],
  ['ko', '한국어'],
  ['it', 'Italiano'],
  ['nl', 'Nederlands'],
  ['bn', 'বাংলা'],
  ['pa', 'ਪੰਜਾਬੀ'],
  ['ta', 'தமிழ்'],
  ['te', 'తెలుగు'],
  ['mr', 'मराठी'],
  ['gu', 'ગુજરાતી'],
] as const;

export type Language = (typeof languages)[number][0];

const supported = new Set(languages.map(([code]) => code));

/** Resolves a device/locale code to a supported Study Flow language, then English. */
export const resolveLanguage = (code?: string | null): Language => {
  const base = (code ?? '').toLowerCase().split('-')[0];
  if (base && supported.has(base as Language)) {
    return base as Language;
  }
  return 'en';
};

export const deviceLanguage = (): Language => {
  try {
    return resolveLanguage(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'en';
  }
};

export { en };
export type { CopyKey };

type Copy = Record<string, string>;

const getCopy = (language: string): Copy => ({
  ...en,
  ...(translations[language] ?? {}),
  ...(additions[language] ?? {}),
});

export const t = (
  language: string,
  key: string,
  vars?: Record<string, string | number>,
): string => {
  const copy = getCopy(language);
  let value = copy[key] ?? en[key as CopyKey] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
  }
  return value;
};

export const localeTag = (language: string) => {
  const resolved = resolveLanguage(language);
  if (resolved === 'zh') {
    return 'zh-CN';
  }
  if (resolved === 'pt') {
    return 'pt-BR';
  }
  return resolved;
};

export const formatDateTime = (
  language: string,
  value: Date | string,
  options?: Intl.DateTimeFormatOptions,
) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(
    localeTag(language),
    options ?? { dateStyle: 'medium', timeStyle: 'short' },
  ).format(date);
};

export const formatDate = (language: string, value: Date | string) =>
  formatDateTime(language, value, { dateStyle: 'medium' });

export const formatTime = (language: string, value: Date | string) =>
  formatDateTime(language, value, { hour: 'numeric', minute: '2-digit' });

export const formatDurationLocale = (language: string, seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}${t(language, 'hoursShort')} ${remainingMinutes}${t(language, 'minutesShort')}`;
  }
  return `${remainingMinutes}${t(language, 'minutesShort')}`;
};

export const subscriptionStatusLabel = (language: string, status: string) => {
  const map: Record<string, CopyKey> = {
    none: 'statusNone',
    active: 'statusActive',
    cancelled: 'statusCancelled',
    expired: 'statusExpired',
    failed: 'statusFailed',
    ending: 'statusEnding',
    pending: 'statusPending',
    refunded: 'statusRefunded',
  };
  const key = map[status];
  return key ? t(language, key) : status;
};

export const validateLocales = (): string[] =>
  languages
    .filter(([code]) => {
      if (code === 'en') {
        return Object.values(en).some((value) => !value.trim());
      }

      const locale = getCopy(code);
      return (Object.keys(en) as CopyKey[]).some((key) => {
        const value = locale[key] ?? en[key];
        return typeof value !== 'string' || value.trim().length === 0;
      });
    })
    .map(([code]) => code);

export const missingKeys = (language: string): string[] => {
  if (language === 'en') {
    return [];
  }
  const locale = {
    ...(translations[language] ?? {}),
    ...(additions[language] ?? {}),
  };
  return (Object.keys(en) as CopyKey[]).filter((key) => !locale[key]);
};
