export function configuredSecret(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Current Gemini Flash model. 2.0 Flash was shut down; 2.5 Flash is unavailable to this project. */
export const DEFAULT_GEMINI_CHAT_MODEL = 'gemini-3.6-flash';
export const SHUT_DOWN_GEMINI_CHAT_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

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

export function isGeminiQuotaError(httpStatus?: number, raw?: string) {
  if (httpStatus === 429) return true;
  return /RESOURCE_EXHAUSTED|exceeded your current quota|quota.*billing/i.test(raw ?? '');
}

export const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

export function geminiImageQuotaMessage() {
  return 'Image generation is temporarily unavailable because this project’s Gemini image quota is used up. Leo text chat and PDFs still work. Please try again later.';
}

export type ImageQuotaAction = 'openai_fallback' | 'quota_unavailable' | 'rethrow';

export function imageActionAfterGeminiError(input: {
  httpStatus?: number;
  raw?: string;
  openaiImageKey?: string | null;
}): ImageQuotaAction {
  if (!isGeminiQuotaError(input.httpStatus, input.raw)) return 'rethrow';
  if (configuredSecret(input.openaiImageKey)) return 'openai_fallback';
  return 'quota_unavailable';
}

/** One retry only, and only when the current chat model is not already the default. */
export function fallbackGeminiChatModel(currentModel: string, errorText: string) {
  if (!isGeminiModelNotFound(errorText)) return undefined;
  if (currentModel === DEFAULT_GEMINI_CHAT_MODEL) return undefined;
  return DEFAULT_GEMINI_CHAT_MODEL;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function geminiPartText(part: Record<string, unknown>, includeThought: boolean) {
  if (part.thought === true && !includeThought) return '';
  if (typeof part.text === 'string' && part.text) return part.text;
  const executable = asRecord(part.executableCode) ?? asRecord(part.executable_code);
  if (typeof executable?.code === 'string' && executable.code) return executable.code;
  const executed = asRecord(part.codeExecutionResult) ?? asRecord(part.code_execution_result);
  if (typeof executed?.output === 'string' && executed.output) return executed.output;
  return '';
}

function collectGeminiParts(payload: Record<string, unknown>) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const parts: Record<string, unknown>[] = [];
  for (const candidate of candidates) {
    const record = asRecord(candidate);
    if (!record) continue;
    const content = record.content;
    const contents = Array.isArray(content)
      ? content
      : content
        ? [content]
        : Array.isArray(record.parts)
          ? [record]
          : [];
    for (const item of contents) {
      const contentRecord = asRecord(item);
      if (!contentRecord) continue;
      const rawParts = contentRecord.parts;
      if (Array.isArray(rawParts)) {
        for (const part of rawParts) {
          const partRecord = asRecord(part);
          if (partRecord) parts.push(partRecord);
        }
      } else if (typeof contentRecord.text === 'string') {
        parts.push(contentRecord);
      }
    }
  }
  return parts;
}

/** Visible text from a Gemini generateContent / streamGenerateContent payload. */
export function extractGeminiText(data: unknown): string {
  const payloads = Array.isArray(data) ? data : data ? [data] : [];
  const visible: string[] = [];
  const thought: string[] = [];
  for (const payload of payloads) {
    const record = asRecord(payload);
    if (!record) continue;
    if (typeof record.text === 'string' && record.text.trim() && !record.candidates) {
      visible.push(record.text);
      continue;
    }
    for (const part of collectGeminiParts(record)) {
      const answer = geminiPartText(part, false);
      if (answer) {
        visible.push(answer);
        continue;
      }
      const thoughtText = geminiPartText(part, true);
      if (part.thought === true && thoughtText) thought.push(thoughtText);
    }
  }
  return (visible.join('') || thought.join('\n')).trim();
}

export function extractGeminiTextFromStreamBody(raw: string) {
  const text = raw.replace(/\r\n/g, '\n');
  const chunks: string[] = [];
  const looksLikeSse = /(?:^|\n)data:/.test(text);
  if (looksLikeSse) {
    for (const block of `${text}\n\n`.split('\n\n')) {
      const line = block.split('\n').find((item) => item.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const delta = extractGeminiText(JSON.parse(payload));
        if (delta) chunks.push(delta);
      } catch {
        // ignore malformed stream chunks
      }
    }
    if (chunks.length) return chunks.join('').trim();
  }
  try {
    return extractGeminiText(JSON.parse(text));
  } catch {
    return chunks.join('').trim();
  }
}
