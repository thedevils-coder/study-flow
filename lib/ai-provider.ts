export function configuredSecret(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Current Gemini Flash model. gemini-2.0-flash was shut down 1 June 2026. */
export const DEFAULT_GEMINI_CHAT_MODEL = 'gemini-3.6-flash';
export const SHUT_DOWN_GEMINI_CHAT_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite'];

export type TextChatChoice =
  | { provider: 'openai'; withSearch: false }
  | { provider: 'gemini'; withSearch: false }
  | { provider: 'none'; withSearch: false; code: 'ai_not_configured' };

export type ResearchChoice =
  | { provider: 'gemini'; withSearch: true }
  | { provider: 'none'; withSearch: false; code: 'research_not_configured' };

/**
 * Normal Leo chat (fast / balanced / detailed, notes, quiz, plans) prefers
 * OpenAI when AI_API_KEY is set. Otherwise Gemini handles the same chat
 * without Google Search grounding.
 */
export function selectTextChatProvider(input: {
  openaiKey?: string | null;
  geminiKey?: string | null;
}): TextChatChoice {
  if (configuredSecret(input.openaiKey)) return { provider: 'openai', withSearch: false };
  if (configuredSecret(input.geminiKey)) return { provider: 'gemini', withSearch: false };
  return { provider: 'none', withSearch: false, code: 'ai_not_configured' };
}

/** Research / “latest” questions require Gemini Google Search grounding. */
export function selectResearchProvider(input: { geminiKey?: string | null }): ResearchChoice {
  if (configuredSecret(input.geminiKey)) return { provider: 'gemini', withSearch: true };
  return { provider: 'none', withSearch: false, code: 'research_not_configured' };
}

export function redactProviderText(value: string) {
  return value
    .replace(/AIza[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/key=[^&\s]+/gi, 'key=[redacted]');
}

export function summarizeGeminiError(raw: string) {
  const redacted = redactProviderText(raw).trim();
  if (!redacted) return '';
  try {
    const parsed = JSON.parse(redacted) as { error?: { status?: string; code?: string | number; message?: string }; status?: string; code?: string | number; message?: string };
    const err = parsed.error ?? parsed;
    const status = err.status || (typeof err.code === 'string' ? err.code : undefined);
    const message = typeof err.message === 'string' ? err.message.replace(/\s+/g, ' ').trim() : '';
    if (message) return `${status ? `${status}: ` : ''}${message}`.slice(0, 220);
  } catch {
    // Fall through to a compact raw snippet.
  }
  return redacted.replace(/\s+/g, ' ').slice(0, 220);
}

export function isGeminiModelNotFound(raw: string) {
  return /NOT_FOUND|is not found|not supported for generateContent|no longer available/i.test(raw);
}

export function recommendedGeminiModelFromError(raw: string) {
  const match = raw.match(/use models\/([a-z0-9._-]+)/i);
  return match?.[1];
}

export function formatGeminiProviderError(
  generic: string,
  details?: { httpStatus?: number; message?: string } | null,
) {
  const base = generic.replace(/\s+/g, ' ').trim();
  const summary = details?.message ? summarizeGeminiError(details.message) : '';
  const status = details?.httpStatus ? `HTTP ${details.httpStatus}` : '';
  const parts = [base];
  if (status && !base.includes(status)) parts.push(status);
  if (summary && !base.includes(summary.slice(0, 24))) parts.push(summary);
  return parts.filter(Boolean).join(' — ');
}

export function resolveGeminiChatModel(configured?: string | null) {
  const model = configuredSecret(configured) ?? DEFAULT_GEMINI_CHAT_MODEL;
  if (SHUT_DOWN_GEMINI_CHAT_MODELS.includes(model)) return DEFAULT_GEMINI_CHAT_MODEL;
  return model;
}
