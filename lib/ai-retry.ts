import type { ChatMessage } from '@/lib/ai-types';

function lastUserIndex(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') return index;
  }
  return -1;
}

export function conversationForRetry(messages: ChatMessage[]) {
  const last = messages[messages.length - 1];
  if (last?.role === 'assistant' && last.status === 'error') {
    const history = messages.slice(0, -1);
    const userIndex = lastUserIndex(history);
    const user = userIndex >= 0 ? history[userIndex] : undefined;
    return {
      prompt: user?.content ?? '',
      history,
      userMessageId: user?.id,
      assistantMessageId: last.id,
    };
  }

  const userIndex = lastUserIndex(messages);
  const user = userIndex >= 0 ? messages[userIndex] : undefined;
  return {
    prompt: user?.content ?? '',
    history: userIndex >= 0 ? messages.slice(0, userIndex + 1) : messages,
    userMessageId: user?.id,
    assistantMessageId: last?.id,
  };
}

export function newMessageId() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
