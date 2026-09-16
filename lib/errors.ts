export function extractErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error.replace(/\s+/g, ' ').trim();

  if (typeof error === 'object') {
    const value = error as Record<string, unknown>;
    const parts = [value.message, value.error_description, value.details, value.hint, value.code]
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
  return /schema cache|does not exist|PGRST205|PGRST204|42P01/i.test(message);
}

export function userFacingError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const message = extractErrorMessage(error);
  if (!message) return fallback;
  if (/service[_-]?role/i.test(message) || /sk_live_|sk_test_/i.test(message)) {
    return fallback;
  }
  return message.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]');
}

export class ConfigurationError extends Error {
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
