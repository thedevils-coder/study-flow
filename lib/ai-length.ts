import type { AiMode, DetailLevel } from '@/lib/ai-types';

/** Gemini 3.6 Flash default. maxOutputTokens includes thinking tokens. */
export type GeminiThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';
export const DEFAULT_GEMINI_THINKING_LEVEL: GeminiThinkingLevel = 'medium';

export function lengthInstruction(detailLevel: DetailLevel) {
  if (detailLevel === 'short') {
    return [
      'Response length: SHORT.',
      'Give a concise answer that directly addresses the question.',
      'Normally use 1-3 short paragraphs or a small bullet list.',
      'Do not expand into extra background, recap sections, or padding.',
    ].join(' ');
  }
  if (detailLevel === 'detailed') {
    return [
      'Response length: DETAILED.',
      'Give a genuinely thorough explanation.',
      'Cover the important concepts step-by-step.',
      'Include examples, explanations, caveats, and practical details when they help the student.',
      'Do not intentionally keep the answer short.',
      'If the question is broad, write a substantial answer rather than a summary.',
    ].join(' ');
  }
  return [
    'Response length: BALANCED.',
    'Give a normal helpful study-assistant answer.',
    'Explain the important points and include examples when useful.',
    'Normally use about 4-8 paragraphs or bullets depending on the question.',
    'Do not shrink this into a short summary, and do not pad with filler.',
  ].join(' ');
}

/**
 * Generous output ceiling for Gemini 3.x. Thinking tokens count against this
 * budget, so Short/Balanced must not reuse the old 500-token fast_answer cap.
 * Visible verbosity is controlled by lengthInstruction, not by a tight token cap.
 */
export function geminiMaxOutputTokens(detailLevel: DetailLevel, mode?: AiMode) {
  if (mode === 'pdf' || mode === 'notes') return 32768;
  if (detailLevel === 'short') return 8192;
  if (detailLevel === 'detailed' || mode === 'detailed_answer') return 32768;
  return 16384;
}

export function geminiThinkingLevel(detailLevel: DetailLevel): GeminiThinkingLevel {
  if (detailLevel === 'short') return 'low';
  return DEFAULT_GEMINI_THINKING_LEVEL;
}

/** Gemini 3.x generationConfig. Do not set temperature or stopSequences. */
export function geminiGenerationConfig(
  maxOutputTokens: number,
  thinkingLevel: GeminiThinkingLevel = DEFAULT_GEMINI_THINKING_LEVEL,
) {
  return {
    maxOutputTokens,
    thinkingConfig: {
      thinkingLevel,
      includeThoughts: false as const,
    },
  };
}
