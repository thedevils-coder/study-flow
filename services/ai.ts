import { AiKind } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type GenerateInput = {
  kind: AiKind;
  prompt: string;
  context?: {
    tasks?: { title: string; scheduledAt?: string | null; done: boolean }[];
    goals?: { title: string; currentValue: number; targetValue: number; dueAt?: string | null }[];
    focusMinutesThisWeek?: number;
  };
};

export type GenerateResult = {
  id?: string;
  text: string;
  kind: AiKind;
  usage?: { remaining: number; limit: number };
};

export async function generateAi(input: GenerateInput): Promise<GenerateResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await getSupabase().functions.invoke('ai-generate', {
    body: {
      kind: input.kind,
      prompt: input.prompt,
      context: input.context ?? null,
    },
  });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return {
    id: data?.id,
    text: String(data?.text ?? ''),
    kind: input.kind,
    usage: data?.usage,
  };
}
