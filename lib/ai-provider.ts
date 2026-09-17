export function configuredSecret(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

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
