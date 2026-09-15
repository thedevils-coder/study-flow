export function userFacingError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof Error && error.message) {
    const message = error.message.replace(/\s+/g, ' ').trim();
    if (/api key|service.role|secret|token/i.test(message)) {
      return fallback;
    }
    return message;
  }
  return fallback;
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
