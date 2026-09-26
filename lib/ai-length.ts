import type { AiMode, DetailLevel } from '@/lib/ai-types';

/** Gemini 3.6 Flash default. maxOutputTokens includes thinking tokens. */
export type GeminiThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';
export const DEFAULT_GEMINI_THINKING_LEVEL: GeminiThinkingLevel = 'medium';

export function lengthInstruction(detailLevel: DetailLevel) {
  if (detailLevel === 'short') {
    return [
      'Response length: SHORT.',
      'Be concise, but still answer the question completely.',
      'Give the key explanation needed to understand the answer.',
      'Use a few short paragraphs or a focused bullet list when helpful.',
      'Do not omit important reasoning, definitions, steps, or necessary context just to make the answer shorter.',
      'Avoid unnecessary background and repetition.',
    ].join(' ');
  }

  if (detailLevel === 'detailed') {
    return [
      'Response length: DETAILED.',
      'Give a genuinely thorough and comprehensive explanation.',
      'Cover the important concepts step-by-step and explain the reasoning clearly.',
      'Include examples, explanations, caveats, comparisons, and practical details when they help the student.',
      'For complex questions, explore the important parts rather than giving only a summary.',
      'Use as much of the available response capacity as necessary to answer the question properly.',
      'Do not artificially shorten the answer when additional useful explanation is warranted.',
      'Avoid filler, repetition, and irrelevant tangents.',
    ].join(' ');
  }

  return [
    'Response length: BALANCED.',
    'Give a substantial, complete study-assistant answer.',
    'Explain the important points clearly rather than giving only a brief summary.',
    'Include useful reasoning, examples, steps, and context when appropriate.',
    'For a question that needs explanation, normally provide several well-developed paragraphs or sections rather than a very short response.',
    'Use the available response capacity when the subject genuinely requires more explanation.',
    'Do not artificially shorten the answer, but avoid filler and repetition.',
  ].join(' ');
}

/**
 * Expanded output ceilings for Gemini 3.x. Thinking tokens count against this
 * budget, so Short/Balanced/Detailed have progressively larger token budgets.
 * Visible verbosity is controlled by lengthInstruction, not by a tight token cap.
 */
export function geminiMaxOutputTokens(detailLevel: DetailLevel, mode?: AiMode) {
  if (mode === 'pdf' || mode === 'notes') return 49152;
  if (detailLevel === 'short') return 12288;
  if (detailLevel === 'detailed' || mode === 'detailed_answer') return 49152;
  return 24576;
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