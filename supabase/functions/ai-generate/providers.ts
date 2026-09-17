type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string };
type Attachment = { name?: string; mime?: string; kind?: string; dataBase64?: string };

export function configuredSecret(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const DEFAULT_GEMINI_CHAT_MODEL = 'gemini-3.6-flash';
const SHUT_DOWN_GEMINI_CHAT_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

export function resolveGeminiChatModel(configured?: string | null) {
  const model = configuredSecret(configured) ?? DEFAULT_GEMINI_CHAT_MODEL;
  if (SHUT_DOWN_GEMINI_CHAT_MODELS.includes(model)) return DEFAULT_GEMINI_CHAT_MODEL;
  return model;
}

export function selectTextChatProvider(input: { openaiKey?: string | null; geminiKey?: string | null }) {
  if (configuredSecret(input.openaiKey)) return { provider: 'openai' as const, withSearch: false as const };
  if (configuredSecret(input.geminiKey)) return { provider: 'gemini' as const, withSearch: false as const };
  return { provider: 'none' as const, withSearch: false as const, code: 'ai_not_configured' as const };
}

export function selectResearchProvider(input: { geminiKey?: string | null }) {
  if (configuredSecret(input.geminiKey)) return { provider: 'gemini' as const, withSearch: true as const };
  return { provider: 'none' as const, withSearch: false as const, code: 'research_not_configured' as const };
}

export class ProviderError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, status = 502, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function redact(text: string) {
  return text
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/AIza[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/key=[^&\s]+/gi, 'key=[redacted]')
    .slice(0, 240);
}

function summarizeGeminiError(raw: string) {
  const redacted = redact(raw).trim();
  if (!redacted) return '';
  try {
    const parsed = JSON.parse(redacted) as { error?: { status?: string; message?: string } };
    const err = parsed.error;
    if (err?.message) return `${err.status ? `${err.status}: ` : ''}${err.message}`.slice(0, 220);
  } catch {
    // compact raw snippet
  }
  return redacted.replace(/\s+/g, ' ').slice(0, 220);
}

function formatGeminiProviderError(generic: string, httpStatus: number, raw: string) {
  const summary = summarizeGeminiError(raw);
  return [generic, `HTTP ${httpStatus}`, summary].filter(Boolean).join(' — ');
}

function isGeminiModelNotFound(raw: string) {
  return /NOT_FOUND|is not found|not supported for generateContent|no longer available/i.test(raw);
}

function fallbackGeminiChatModel(currentModel: string, errorText: string) {
  if (!isGeminiModelNotFound(errorText)) return undefined;
  if (currentModel === DEFAULT_GEMINI_CHAT_MODEL) return undefined;
  return DEFAULT_GEMINI_CHAT_MODEL;
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

function extractGeminiText(data: unknown): string {
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

function extractGeminiTextFromStreamBody(raw: string) {
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

async function readError(response: Response) {
  return redact(await response.text());
}

export async function chatOpenAI(input: {
  apiUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  messages: ChatTurn[];
  stream?: boolean;
  onDelta?: (text: string) => void;
}) {
  const response = await fetch(input.apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens,
      stream: Boolean(input.stream),
      messages: input.messages,
    }),
  });
  if (!response.ok) {
    throw new ProviderError('The AI provider could not complete that request.', 'provider_error', 502, {
      httpStatus: response.status,
      message: await readError(response),
    });
  }

  if (!input.stream) {
    const body = await response.json();
    return String(body?.choices?.[0]?.message?.content ?? '').trim();
  }

  if (!response.body) {
    throw new ProviderError('The AI provider did not stream a response.', 'provider_error', 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
        const delta = json.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          full += delta;
          input.onDelta?.(delta);
        }
      } catch {
        // ignore malformed stream chunks
      }
    }
  }
  return full.trim();
}

export async function chatGemini(input: {
  apiKey: string;
  model: string;
  system: string;
  packed: ChatTurn[];
  attachments?: Attachment[];
  withSearch?: boolean;
  maxTokens: number;
  stream?: boolean;
  onDelta?: (text: string) => void;
}) {
  const model = resolveGeminiChatModel(input.model);
  const parts: Array<Record<string, unknown>> = [
    { text: input.packed.map((item) => `${item.role}: ${item.content}`).join('\n\n') },
  ];
  for (const file of input.attachments ?? []) {
    if (!file.dataBase64) continue;
    parts.push({
      inline_data: { mime_type: file.mime || 'application/octet-stream', data: file.dataBase64 },
    });
  }

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: input.system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { maxOutputTokens: input.maxTokens },
  };
  if (input.withSearch) body.tools = [{ google_search: {} }];

  const endpoint = input.stream ? 'streamGenerateContent' : 'generateContent';
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}` +
    (input.stream ? '?alt=sse' : '');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': input.apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await readError(response);
    if (input.stream) {
      return chatGemini({ ...input, model, stream: false });
    }
    const fallback = fallbackGeminiChatModel(model, errText);
    if (fallback) {
      return chatGemini({ ...input, model: fallback, stream: false });
    }
    throw new ProviderError(
      formatGeminiProviderError(
        input.withSearch ? 'Google/Gemini research could not complete that request.' : 'Gemini could not complete that request.',
        response.status,
        errText,
      ),
      input.withSearch ? 'search_error' : 'provider_error',
      502,
      { httpStatus: response.status, message: errText, model },
    );
  }

  const collectSources = (data: Record<string, unknown>) => {
    const candidate = Array.isArray(data.candidates) ? (data.candidates[0] as Record<string, unknown> | undefined) : undefined;
    const metadata = candidate?.groundingMetadata as { groundingChunks?: unknown[] } | undefined;
    return metadata?.groundingChunks ?? [];
  };

  if (!input.stream) {
    const data = (await response.json()) as Record<string, unknown>;
    return { answer: extractGeminiText(data), chunks: collectSources(data) };
  }

  if (!response.body) {
    throw new ProviderError('Gemini did not stream a response.', 'provider_error', 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let buffer = '';
  let answer = '';
  let chunks: unknown[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const piece = decoder.decode(value, { stream: true });
    raw += piece;
    buffer += piece;
    const partsSse = buffer.replace(/\r\n/g, '\n').split('\n\n');
    buffer = partsSse.pop() ?? '';
    for (const part of partsSse) {
      const line = part.split('\n').find((item) => item.startsWith('data:'));
      if (!line) continue;
      try {
        const json = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
        const delta = extractGeminiText(json);
        if (delta) {
          answer += delta;
          input.onDelta?.(delta);
        }
        const nextChunks = collectSources(json);
        if (nextChunks.length) chunks = nextChunks;
      } catch {
        // ignore malformed stream chunks
      }
    }
  }
  const tail = decoder.decode();
  if (tail) {
    raw += tail;
    buffer += tail;
  }
  if (buffer.trim()) {
    const leftover = extractGeminiTextFromStreamBody(buffer);
    if (leftover && !answer.includes(leftover)) {
      answer += leftover;
      input.onDelta?.(leftover);
    }
  }
  answer = answer.trim() || extractGeminiTextFromStreamBody(raw);
  if (!answer) {
    return chatGemini({ ...input, model, stream: false });
  }
  return { answer, chunks };
}

export async function generateOpenAiImage(input: {
  apiUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const response = await fetch(input.apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: input.model,
      prompt: input.prompt.slice(0, 3000),
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });
  if (!response.ok) {
    throw new ProviderError('Image generation failed.', 'image_error', 502, {
      httpStatus: response.status,
      message: await readError(response),
    });
  }
  const data = await response.json();
  const item = data?.data?.[0] ?? {};
  if (typeof item.b64_json === 'string' && item.b64_json) {
    const binary = atob(item.b64_json);
    return {
      bytes: Uint8Array.from(binary, (char) => char.charCodeAt(0)),
      mime: 'image/png',
    };
  }
  if (typeof item.url === 'string' && /^https?:\/\//i.test(item.url)) {
    const image = await fetch(item.url);
    if (!image.ok) {
      throw new ProviderError('Image generation returned a URL that could not be downloaded.', 'image_error', 502);
    }
    return {
      bytes: new Uint8Array(await image.arrayBuffer()),
      mime: image.headers.get('content-type') || 'image/png',
    };
  }
  throw new ProviderError('Image generation returned no image.', 'image_error', 502);
}

export async function generateGeminiImage(input: { apiKey: string; model: string; prompt: string }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': input.apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    },
  );
  if (!response.ok) {
    throw new ProviderError('Gemini image generation failed.', 'image_error', 502, {
      httpStatus: response.status,
      message: await readError(response),
    });
  }
  const data = await response.json();
  const inline = data?.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { data?: string; mimeType?: string }; inline_data?: { data?: string; mime_type?: string } }) =>
      part.inlineData?.data || part.inline_data?.data,
  );
  const payload = inline?.inlineData ?? inline?.inline_data;
  const raw = payload?.data;
  if (!raw) throw new ProviderError('Gemini image generation returned no image.', 'image_error', 502);
  const binary = atob(raw);
  return {
    bytes: Uint8Array.from(binary, (char) => char.charCodeAt(0)),
    mime: payload.mimeType || payload.mime_type || 'image/png',
  };
}
