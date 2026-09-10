import { en, CopyKey } from '@/i18n/en';
import { translations } from '@/i18n/translations';

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
});

export const t = (language: string, key: string): string => {
  const copy = getCopy(language);
  return copy[key] ?? en[key as CopyKey] ?? key;
};

export const validateLocales = (): string[] =>
  languages
    .filter(([code]) => {
      if (code === 'en') {
        return Object.values(en).some((value) => !value.trim());
      }

      const locale = translations[code] ?? {};
      return (Object.keys(en) as CopyKey[]).some((key) => {
        const value = locale[key] ?? en[key];
        return typeof value !== 'string' || value.trim().length === 0;
      });
    })
    .map(([code]) => code);

export const missingKeys = (language: string): string[] => {
  const locale = translations[language] ?? {};
  return (Object.keys(en) as CopyKey[]).filter((key) => !locale[key]);
};
