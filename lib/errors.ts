function shouldSurfaceDeveloperErrors() {
  try {
    // Lazy require so unit tests do not need Expo runtime globals.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default as {
      expoConfig?: { extra?: Record<string, unknown> };
    };
    const extra = Constants?.expoConfig?.extra ?? {};
    if (extra.testerAccountEnabled === false || extra.testerAccountEnabled === 'false') return false;
  } catch {
    // Node tests and environments without expo-constants keep developer-visible errors.
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__ === false) return false;
  return true;
}

export function extractErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error.replace(/\s+/g, ' ').trim();

  if (typeof error === 'object') {
    const value = error as Record<string, unknown>;
    const parts = [value.message, value.error_description, value.error, value.details, value.hint, value.code]
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.replace(/\s+/g, ' ').trim());
    const unique = [...new Set(parts)];
    if (unique.length) return unique.join(' — ');
  }

  if (error instanceof Error && error.message) {
    return error.message.replace(/\s+/g, ' ').trim();
  }

  return '';
}

export function isMissingRelationError(error: unknown) {
  const message = extractErrorMessage(error);
  return /schema cache|does not exist|PGRST205|42P01/i.test(message);
}

export function isMissingColumnError(error: unknown) {
  const message = extractErrorMessage(error);
  return /Could not find the '.+' column|column .+ does not exist|PGRST204|42703/i.test(message);
}

function redactSecrets(message: string) {
  return message
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/sb_secret_[A-Za-z0-9_-]+/g, '[redacted]');
}

const SAFE_PRODUCTION_MESSAGE =
  /sign in required|upgrade|free trial|AI limit|not configured|notification permission|reminders are|enter a prompt|enter a goal|enter a task|unable to|missing in this Supabase project|Edge Function is not deployed/i;

export function userFacingError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const message = redactSecrets(extractErrorMessage(error));
  if (!message) return fallback;
  if (/service[_-]?role/i.test(message) || /sk_live_|sk_test_/i.test(message)) {
    return fallback;
  }
  if (!shouldSurfaceDeveloperErrors()) {
    if (SAFE_PRODUCTION_MESSAGE.test(message) && !/PGRST|42P01|42703|schema cache/i.test(message)) {
      return message;
    }
    return fallback;
  }
  return message;
}

export class ConfigurationError extends Error {
  savedSettings?: unknown;

  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class AccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessError';
  }
}
