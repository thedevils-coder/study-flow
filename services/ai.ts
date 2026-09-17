import { AccessError, ConfigurationError, isMissingRelationError } from '@/lib/errors';
import { sanitizeArtifacts } from '@/lib/ai-artifacts';
import { packConversation } from '@/lib/ai-context';
import { errorFromAiFailure } from '@/lib/ai-errors';
import { formatGeminiProviderError } from '@/lib/ai-provider';
import { parseFunctionsInvokeFailure } from '@/lib/functions-error';
import { canUseKind, dailyAiLimit, getTier } from '@/lib/entitlements';
import { sanitizeSources } from '@/lib/ai-sources';
import { parseSseBuffer, sseDeltaText } from '@/lib/ai-sse';
import { startOfUtcDay } from '@/lib/ai-usage';
import { publicConfig } from '@/lib/config';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { parseSchedule } from '@/lib/schedule';
import type {
  AiAttachment,
  ChatMessage,
  DetailLevel,
  GenerateFailure,
  GenerateSuccess,
} from '@/lib/ai-types';
import type { AiActivity, AiKind, UserSession } from '@/types';

type GenerationRow = {
  id: string;
  user_id: string;
  kind: AiKind;
  prompt: string;
  result_text: string | null;
  result_meta: Record<string, unknown> | null;
  created_at: string;
  status?: string | null;
};

const mapActivity = (row: GenerationRow): AiActivity => ({
  id: row.id,
  userId: row.user_id,
  kind: row.kind,
  prompt: row.prompt,
  resultText: row.result_text ?? '',
  summary: summarize(row.result_text ?? ''),
  createdAt: row.created_at,
  relatedFeature: featureFor(row.kind),
});

function summarize(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= 140) return compact;
  return `${compact.slice(0, 137)}...`;
}

function featureFor(kind: AiKind) {
  if (kind === 'leo') return 'Leo';
  if (kind === 'schedule') return 'AI Schedule Maker';
  return 'AI Meter';
}

export type GenerateResult = {
  id: string;
  text: string;
  kind: AiKind;
  usage?: { remaining: number; limit: number; used?: number };
};

function asSuccess(payload: Record<string, unknown>): GenerateSuccess {
  const text = String(payload.answer ?? payload.text ?? '').trim();
  return {
    success: true,
    id: String(payload.id ?? ''),
    text,
    kind: (payload.kind as AiKind) || 'leo',
    answer: text,
    responseType: (payload.responseType as GenerateSuccess['responseType']) || 'answer',
    detailLevel: (payload.detailLevel as DetailLevel) || 'balanced',
    grounded: Boolean(payload.grounded),
    sources: sanitizeSources(payload.sources),
    artifacts: sanitizeArtifacts(payload.artifacts),
    usage:
      payload.usage && typeof payload.usage === 'object'
        ? {
            remaining: Number((payload.usage as { remaining?: number }).remaining) || 0,
            limit: Number((payload.usage as { limit?: number }).limit) || 0,
            used: Number((payload.usage as { used?: number }).used) || 0,
          }
        : undefined,
    provider: typeof payload.provider === 'string' ? payload.provider : undefined,
    model: typeof payload.model === 'string' ? payload.model : undefined,
  };
}

async function throwInvokeError(error: unknown, data: unknown): Promise<never> {
  const parsed = await parseFunctionsInvokeFailure({ error, data });
  throw errorFromAiFailure(parsed);
}

async function readSse(
  response: Response,
  handlers: {
    onDelta?: (text: string) => void;
    onStatus?: (label: string) => void;
  },
): Promise<GenerateSuccess> {
  const failFromPayload = (data: Record<string, unknown>, status?: number): never => {
    const details = data.details && typeof data.details === 'object' ? (data.details as Record<string, unknown>) : null;
    const generic =
      (typeof data.error === 'string' && data.error) ||
      (typeof data.message === 'string' && data.message) ||
      "Leo couldn't complete that request. Please try again.";
    throw errorFromAiFailure({
      httpStatus: status,
      code: typeof data.code === 'string' ? data.code : undefined,
      message: formatGeminiProviderError(generic, {
        httpStatus: typeof details?.httpStatus === 'number' ? details.httpStatus : status,
        message: typeof details?.message === 'string' ? details.message : undefined,
      }),
    });
  };

  const consumeEvents = (events: ReturnType<typeof parseSseBuffer>['events'], acc: { done: GenerateSuccess | null }) => {
    for (const event of events) {
      if (event.event === 'delta') {
        const text = sseDeltaText(event.data);
        if (text) handlers.onDelta?.(text);
      } else if (event.event === 'status' && typeof event.data.label === 'string') {
        handlers.onStatus?.(event.data.label);
      } else if (event.event === 'error') {
        failFromPayload(event.data, response.status);
      } else if (event.event === 'done') {
        acc.done = asSuccess(event.data);
      }
    }
  };

  const acc = { done: null as GenerateSuccess | null };
  const body = response.body;
  if (!body) {
    const text = await response.text();
    const parsed = parseSseBuffer(`${text}\n\n`);
    consumeEvents(parsed.events, acc);
    if (acc.done) return acc.done;
    throw errorFromAiFailure({
      httpStatus: response.status,
      message: text.slice(0, 240) || "Leo couldn't complete that request. Please try again.",
    });
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.rest;
    consumeEvents(parsed.events, acc);
  }
  if (buffer.trim()) {
    consumeEvents(parseSseBuffer(`${buffer}\n\n`).events, acc);
  }
  if (!acc.done) {
    throw new Error("Leo couldn't complete that request. Please try again.");
  }
  return acc.done;
}

export const aiService = {
  async history(userId: string, limit = 50) {
    if (!isSupabaseConfigured) return [] as AiActivity[];
    const { data, error } = await getSupabase()
      .from('ai_generations')
      .select('id,user_id,kind,prompt,result_text,result_meta,created_at,status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      if (isMissingRelationError(error) || /status|PGRST204|42703/i.test(error.message)) {
        const fallback = await getSupabase()
          .from('ai_generations')
          .select('id,user_id,kind,prompt,result_text,result_meta,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (fallback.error) {
          if (isMissingRelationError(fallback.error)) return [] as AiActivity[];
          throw fallback.error;
        }
        return ((fallback.data ?? []) as GenerationRow[]).map(mapActivity);
      }
      throw error;
    }
    return ((data ?? []) as GenerationRow[])
      .filter((row) => !row.status || row.status === 'success')
      .map(mapActivity);
  },

  async usageToday(userId: string, tierLimit: number) {
    if (!isSupabaseConfigured) return { used: 0, limit: tierLimit, remaining: tierLimit };
    const start = startOfUtcDay().toISOString();
    const counted = await getSupabase()
      .from('ai_generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', start)
      .eq('status', 'success');
    const result =
      counted.error && /status|PGRST204|42703/i.test(counted.error.message)
        ? await getSupabase()
            .from('ai_generations')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', start)
        : counted;
    if (result.error) {
      if (isMissingRelationError(result.error)) return { used: 0, limit: tierLimit, remaining: tierLimit };
      throw result.error;
    }
    const used = result.count ?? 0;
    return { used, limit: tierLimit, remaining: Math.max(0, tierLimit - used) };
  },

  async get(id: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { data, error } = await getSupabase()
      .from('ai_generations')
      .select('id,user_id,kind,prompt,result_text,result_meta,created_at')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapActivity(data as GenerationRow);
  },

  async remove(id: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { error } = await getSupabase().from('ai_generations').delete().eq('id', id);
    if (error) throw error;
  },

  async generate(input: {
    session: UserSession;
    kind: AiKind;
    prompt: string;
    context?: Record<string, unknown>;
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    attachments?: AiAttachment[];
    detailLevel?: DetailLevel;
  }): Promise<GenerateResult> {
    const prompt = input.prompt.trim();
    if (!prompt) throw new Error('Enter a prompt first.');
    if (!isSupabaseConfigured) throw new ConfigurationError('Supabase is not configured.');

    const tier = getTier(input.session);
    if (!canUseKind(tier, input.kind)) {
      throw new AccessError(
        input.kind === 'leo' || input.kind === 'schedule' || input.kind === 'flashcards' || input.kind === 'quiz'
          ? 'This tool is included with Study Flow Pro and the free trial.'
          : 'Start a free trial or choose Basic to use AI Meter.',
      );
    }

    const { data, error } = await getSupabase().functions.invoke('ai-generate', {
      body: {
        kind: input.kind,
        prompt,
        context: input.context ?? null,
        messages: input.messages ?? [],
        attachments: input.attachments ?? [],
        detailLevel: input.detailLevel,
        stream: false,
      },
    });

    if (error) {
      await throwInvokeError(error, data);
    }

    const payload = (data ?? {}) as Record<string, unknown>;
    if (payload.success === false || payload.error) {
      throw errorFromAiFailure({
        code: typeof payload.code === 'string' ? payload.code : undefined,
        message: String(payload.error || 'Unable to generate a response.'),
      });
    }
    const success = asSuccess(payload);
    return { id: success.id, text: success.text, kind: success.kind, usage: success.usage };
  },

  async chat(input: {
    session: UserSession;
    prompt: string;
    history: ChatMessage[];
    attachments?: AiAttachment[];
    detailLevel?: DetailLevel;
    conversationId?: string;
    context?: Record<string, unknown>;
    onDelta?: (text: string) => void;
    onStatus?: (label: string) => void;
  }): Promise<GenerateSuccess> {
    const prompt = input.prompt.trim();
    if (!prompt) throw new Error('Enter a prompt first.');
    if (!isSupabaseConfigured) throw new ConfigurationError('Supabase is not configured.');

    const tier = getTier(input.session);
    if (!canUseKind(tier, 'leo')) {
      throw new AccessError('This tool is included with Study Flow Pro and the free trial.');
    }

    const packed = packConversation(input.history, prompt);
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new AccessError('Sign in required.');

    const body = {
      kind: 'leo' as const,
      prompt,
      messages: packed.messages.slice(0, -1),
      attachments: (input.attachments ?? []).slice(0, 2),
      detailLevel: input.detailLevel,
      conversationId: input.conversationId ?? null,
      context: input.context ?? null,
      stream: true,
    };

    let response: Response;
    try {
      response = await fetch(`${publicConfig.supabaseUrl}/functions/v1/ai-generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: publicConfig.supabasePublishableKey,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error("Leo couldn't complete that request. Please try again.");
      }
      throw error;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      const data = await response.json().catch(() => ({ error: 'Unable to generate a response.' }));
      if (!response.ok || data?.success === false || data?.error) {
        const details = data?.details && typeof data.details === 'object' ? (data.details as Record<string, unknown>) : null;
        throw errorFromAiFailure({
          httpStatus: response.status,
          code: typeof data?.code === 'string' ? data.code : undefined,
          message: formatGeminiProviderError(String(data?.error || data?.message || "Leo couldn't complete that request. Please try again."), {
            httpStatus: typeof details?.httpStatus === 'number' ? details.httpStatus : response.status,
            message: typeof details?.message === 'string' ? details.message : undefined,
          }),
        });
      }
      return asSuccess(data as Record<string, unknown>);
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Leo couldn't complete that request. Please try again." }));
      const details = data?.details && typeof data.details === 'object' ? (data.details as Record<string, unknown>) : null;
      throw errorFromAiFailure({
        httpStatus: response.status,
        code: typeof data?.code === 'string' ? data.code : undefined,
        message: formatGeminiProviderError(String(data?.error || data?.message || "Leo couldn't complete that request. Please try again."), {
          httpStatus: typeof details?.httpStatus === 'number' ? details.httpStatus : response.status,
          message: typeof details?.message === 'string' ? details.message : undefined,
        }),
      });
    }

    return readSse(response, { onDelta: input.onDelta, onStatus: input.onStatus });
  },

  dailyLimit: dailyAiLimit,
  parseSchedule,
};

export type { GenerateFailure };
