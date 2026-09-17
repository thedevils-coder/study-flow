import type { ChatMessage, PackedContext } from '@/lib/ai-types';

const DEFAULT_RECENT = 8;
const DEFAULT_MAX_CHARS = 7000;

function isImportant(message: ChatMessage) {
  if (message.role !== 'assistant') return false;
  if (message.grounded) return true;
  if (message.artifacts?.length) return true;
  if (message.responseType === 'notes' || message.responseType === 'quiz' || message.responseType === 'study_plan') {
    return true;
  }
  return false;
}

function clip(text: string, max: number) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 3)}...`;
}

export function packConversation(
  history: ChatMessage[],
  currentPrompt: string,
  options: { recentCount?: number; maxChars?: number } = {},
): PackedContext {
  const recentCount = options.recentCount ?? DEFAULT_RECENT;
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const usable = history.filter((item) => item.role === 'user' || item.status === 'complete');

  if (!usable.length) {
    return { messages: [{ role: 'user', content: currentPrompt }], truncated: false };
  }

  const recent = usable.slice(-recentCount);
  const older = usable.slice(0, Math.max(0, usable.length - recentCount));
  const pinned = older.filter(isImportant).slice(-4);

  const summaryParts = older
    .filter((item) => !pinned.includes(item))
    .slice(-12)
    .map((item) => `${item.role === 'user' ? 'Student' : 'Leo'}: ${clip(item.content, 180)}`);

  const summary = summaryParts.length
    ? `Earlier in this conversation:\n${summaryParts.join('\n')}`
    : undefined;

  const messages: PackedContext['messages'] = [];
  if (summary) messages.push({ role: 'user', content: summary });
  for (const item of [...pinned, ...recent]) {
    messages.push({ role: item.role, content: clip(item.content, 1800) });
  }
  messages.push({ role: 'user', content: currentPrompt });

  let total = messages.reduce((sum, item) => sum + item.content.length, 0);
  if (total <= maxChars) {
    return { messages, summary, truncated: Boolean(older.length) };
  }

  while (messages.length > 2 && total > maxChars) {
    const removed = messages.splice(summary ? 1 : 0, 1)[0];
    total -= removed?.content.length ?? 0;
  }

  return { messages, summary, truncated: true };
}

export function conversationTopic(history: ChatMessage[], fallback = '') {
  const firstUser = history.find((item) => item.role === 'user' && item.content.trim());
  return firstUser?.content.trim() || fallback;
}
