type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string };
type Attachment = { name?: string; mime?: string; kind?: string; dataBase64?: string };

export function configuredSecret(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const DEFAULT_GEMINI_CHAT_MODEL = 'gemini-3.6-flash';
const SHUT_DOWN_GEMINI_CHAT_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite'];

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

function recommendedGeminiModelFromError(raw: string) {
  const match = raw.match(/use models\/([a-z0-9._-]+)/i);
  return match?.[1];
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
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:${endpoint}` +
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
      return chatGemini({ ...input, stream: false });
    }
    const recommended = recommendedGeminiModelFromError(errText);
    if (isGeminiModelNotFound(errText) && recommended && recommended !== input.model) {
      return chatGemini({ ...input, model: recommended, stream: false });
    }
    if (isGeminiModelNotFound(errText) && input.model !== DEFAULT_GEMINI_CHAT_MODEL) {
      return chatGemini({ ...input, model: DEFAULT_GEMINI_CHAT_MODEL, stream: false });
    }
    throw new ProviderError(
      formatGeminiProviderError(
        input.withSearch ? 'Google/Gemini research could not complete that request.' : 'Gemini could not complete that request.',
        response.status,
        errText,
      ),
      input.withSearch ? 'search_error' : 'provider_error',
      502,
      { httpStatus: response.status, message: errText, model: input.model },
    );
  }

  const collectSources = (data: Record<string, unknown>) => {
    const candidate = Array.isArray(data.candidates) ? (data.candidates[0] as Record<string, unknown> | undefined) : undefined;
    const metadata = candidate?.groundingMetadata as { groundingChunks?: unknown[] } | undefined;
    return metadata?.groundingChunks ?? [];
  };

  if (!input.stream) {
    const data = (await response.json()) as Record<string, unknown>;
    const candidate = Array.isArray(data.candidates) ? (data.candidates[0] as Record<string, unknown> | undefined) : undefined;
    const content = candidate?.content as { parts?: Array<{ text?: string }> } | undefined;
    const answer = (content?.parts ?? []).map((part) => part.text || '').join('\n').trim();
    return { answer, chunks: collectSources(data) };
  }

  if (!response.body) {
    throw new ProviderError('Gemini did not stream a response.', 'provider_error', 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let chunks: unknown[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const partsSse = buffer.split('\n\n');
    buffer = partsSse.pop() ?? '';
    for (const part of partsSse) {
      const line = part.split('\n').find((item) => item.startsWith('data:'));
      if (!line) continue;
      try {
        const json = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
        const candidate = Array.isArray(json.candidates) ? (json.candidates[0] as Record<string, unknown> | undefined) : undefined;
        const content = candidate?.content as { parts?: Array<{ text?: string }> } | undefined;
        const delta = (content?.parts ?? []).map((item) => item.text || '').join('');
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
  return { answer: answer.trim(), chunks };
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
