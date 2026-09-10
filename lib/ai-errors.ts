const AI_ERROR_KEYS: [string, string][] = [
  ['not configured on the server', 'aiUnavailable'],
  ['Supabase is not configured', 'supabaseNotConfigured'],
  ['Start a free trial', 'aiNeedsPlan'],
  ['included with Study Flow Pro', 'proFeature'],
  ['reached today’s AI limit', 'usageLimitReached'],
  ["reached today's AI limit", 'usageLimitReached'],
  ['Sign in required', 'sessionExpired'],
  ['Invalid request', 'requiredField'],
  ['The AI provider could not', 'aiError'],
];

/** Maps known server/AI errors onto translation keys. Never returns a raw key for these cases. */
export function aiErrorCopyKey(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const hit = AI_ERROR_KEYS.find(([needle]) => message.includes(needle));
  return hit?.[1] ?? 'aiError';
}
