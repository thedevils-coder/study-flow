import { AccessError, ConfigurationError } from '@/lib/errors';

export function errorFromAiFailure(input: { httpStatus?: number; code?: string; message: string }) {
  const code = input.code ?? '';
  const message = input.message.replace(/\s+/g, ' ').trim() || "Leo couldn't complete that request. Please try again.";

  if (
    input.httpStatus === 401 ||
    input.httpStatus === 403 ||
    code === 'unauthenticated' ||
    code === 'conversation_forbidden' ||
    input.httpStatus === 402 ||
    input.httpStatus === 429 ||
    code === 'payment_required' ||
    code === 'rate_limited'
  ) {
    return new AccessError(message);
  }

  if (
    input.httpStatus === 503 ||
    /not_configured|missing_relation|NOT_FOUND/i.test(code) ||
    /not deployed|not configured/i.test(message)
  ) {
    return new ConfigurationError(message);
  }

  return new Error(message);
}

export function userLeoError(error: unknown) {
  if (error instanceof AccessError || error instanceof ConfigurationError) return error.message;
  if (error instanceof TypeError && /network|fetch|failed/i.test(error.message)) {
    return "Leo couldn't complete that request. Please try again.";
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Leo couldn't complete that request. Please try again.";
}
