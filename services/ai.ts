import { AccessError, ConfigurationError } from '@/lib/errors';
import { canUseKind, getTier } from '@/lib/entitlements';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { parseSchedule } from '@/lib/schedule';
import type { AiActivity, AiKind, UserSession } from '@/types';

type GenerationRow = {
  id: string;
  user_id: string;
  kind: AiKind;
  prompt: string;
  result_text: string | null;
  result_meta: Record<string, unknown> | null;
  created_at: string;
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
  usage?: { remaining: number; limit: number };
};

export const aiService = {
  async history(userId: string, limit = 50) {
    if (!isSupabaseConfigured) return [] as AiActivity[];
    const { data, error } = await getSupabase()
      .from('ai_generations')
      .select('id,user_id,kind,prompt,result_text,result_meta,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as GenerationRow[]).map(mapActivity);
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
      },
    });

    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 503) {
        throw new ConfigurationError(
          'AI generation is not configured on the server yet. Study Flow never stores AI API keys in the app.',
        );
      }
      if (status === 402) {
        throw new AccessError(
          typeof data === 'object' && data && 'error' in data
            ? String((data as { error: string }).error)
            : 'Upgrade to unlock this AI tool.',
        );
      }
      throw new Error(
        typeof data === 'object' && data && 'error' in data
          ? String((data as { error: string }).error)
          : error.message || 'Unable to generate a response.',
      );
    }

    const payload = data as GenerateResult & { error?: string };
    if (payload.error) throw new Error(payload.error);
    return payload;
  },

  parseSchedule,
};
