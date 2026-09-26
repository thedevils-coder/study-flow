import type { ChatMessage } from '@/lib/ai-types';

export const LEGACY_LEO_STORAGE_KEY = 'studyflow.leo.conversation.v1';

export type LeoConversationCache = {
  userId: string;
  conversationId: string;
  messages: ChatMessage[];
};

export const CONVERSATION_FORBIDDEN_CODE = 'conversation_forbidden' as const;

export type ConversationAccessDecision =
  | { allow: true }
  | { allow: false; status: 403; code: typeof CONVERSATION_FORBIDDEN_CODE; error: string };

export function leoConversationStorageKey(userId: string) {
  return `studyflow.leo.conversation.v1:${userId}`;
}

export function serializeLeoConversationCache(cache: LeoConversationCache) {
  return JSON.stringify({
    userId: cache.userId,
    conversationId: cache.conversationId,
    messages: cache.messages,
  });
}

function asMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ChatMessage => {
    if (!item || typeof item !== 'object') return false;
    const record = item as ChatMessage;
    return typeof record.id === 'string' && (record.role === 'user' || record.role === 'assistant');
  });
}

/** Restore a cache only when it is explicitly owned by expectedUserId. */
export function parseLeoConversationCache(raw: string | null | undefined, expectedUserId: string): LeoConversationCache | null {
  if (!raw || !expectedUserId) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LeoConversationCache> & { messages?: unknown };
    if (typeof parsed.userId !== 'string' || parsed.userId !== expectedUserId) return null;
    if (typeof parsed.conversationId !== 'string' || !parsed.conversationId) return null;
    return {
      userId: parsed.userId,
      conversationId: parsed.conversationId,
      messages: asMessages(parsed.messages).filter((item) => item.status !== 'streaming' && item.status !== 'sending'),
    };
  } catch {
    return null;
  }
}

export function leoStateForAccount(input: {
  previousUserId: string | null;
  nextUserId: string | null;
  stores: Record<string, string>;
  newConversationId: string;
}): { cache: LeoConversationCache | null; activeKey: string | null; shouldClearLegacy: boolean } {
  if (!input.nextUserId) {
    return { cache: null, activeKey: null, shouldClearLegacy: true };
  }
  const activeKey = leoConversationStorageKey(input.nextUserId);
  const cache = parseLeoConversationCache(input.stores[activeKey], input.nextUserId);
  return { cache, activeKey, shouldClearLegacy: true };
}

export function shouldApplyLeoResult(ownerUserId: string | null | undefined, currentUserId: string | null | undefined) {
  return Boolean(ownerUserId && currentUserId && ownerUserId === currentUserId);
}

export function conversationAccessDecision(input: {
  conversationId?: string | null;
  requesterId: string;
  existingOwners: string[];
}): ConversationAccessDecision {
  const conversationId = input.conversationId?.trim();
  if (!conversationId) return { allow: true };
  const foreign = input.existingOwners.filter((owner) => owner && owner !== input.requesterId);
  if (foreign.length) {
    return {
      allow: false,
      status: 403,
      code: CONVERSATION_FORBIDDEN_CODE,
      error: 'That conversation belongs to another account.',
    };
  }
  return { allow: true };
}

export function generationBelongsToUser(row: { userId?: string | null; user_id?: string | null } | null, userId: string) {
  if (!row || !userId) return false;
  const owner = row.userId ?? row.user_id;
  return owner === userId;
}
