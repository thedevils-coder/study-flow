import { describe, expect, it } from 'vitest';

import { errorFromAiFailure } from '@/lib/ai-errors';
import { AccessError } from '@/lib/errors';
import {
  CONVERSATION_FORBIDDEN_CODE,
  LEGACY_LEO_STORAGE_KEY,
  conversationAccessDecision,
  generationBelongsToUser,
  leoConversationStorageKey,
  leoStateForAccount,
  parseLeoConversationCache,
  serializeLeoConversationCache,
  shouldApplyLeoResult,
} from '@/lib/leo-isolation';
import { buildTesterSeed } from '@/lib/tester-seed';
import type { ChatMessage } from '@/lib/ai-types';

const userA = 'user-a';
const userB = 'user-b';

const message = (id: string, content: string): ChatMessage => ({
  id,
  role: 'user',
  content,
  status: 'complete',
});

const cacheFor = (userId: string, conversationId: string, content: string) =>
  serializeLeoConversationCache({
    userId,
    conversationId,
    messages: [message(`${userId}-m1`, content)],
  });

describe('Leo account isolation', () => {
  it('stores the owning userId in cached Leo JSON', () => {
    const raw = cacheFor(userA, 'conv-a', 'User A thread');
    const parsed = JSON.parse(raw) as { userId?: string; conversationId?: string };
    expect(parsed.userId).toBe(userA);
    expect(parsed.conversationId).toBe('conv-a');
    expect(leoConversationStorageKey(userA)).toBe(`studyflow.leo.conversation.v1:${userA}`);
  });

  it('Test A: User B does not see User A’s cached Leo conversation', () => {
    const stores = {
      [leoConversationStorageKey(userA)]: cacheFor(userA, 'conv-a', 'Tester asked about photosynthesis.'),
    };
    const switched = leoStateForAccount({
      previousUserId: userA,
      nextUserId: userB,
      stores,
      newConversationId: 'conv-b-new',
    });
    expect(switched.cache).toBeNull();
    expect(switched.activeKey).toBe(leoConversationStorageKey(userB));
    expect(parseLeoConversationCache(stores[leoConversationStorageKey(userA)], userB)).toBeNull();
  });

  it('Test B: User B starts with clean Leo state after User A logs out', () => {
    const stores = {
      [LEGACY_LEO_STORAGE_KEY]: JSON.stringify({
        conversationId: 'legacy-a',
        messages: [message('legacy', 'Secret notes from User A')],
      }),
      [leoConversationStorageKey(userA)]: cacheFor(userA, 'conv-a', 'Secret notes from User A'),
    };
    const signedOut = leoStateForAccount({
      previousUserId: userA,
      nextUserId: null,
      stores,
      newConversationId: 'unused',
    });
    expect(signedOut.cache).toBeNull();
    expect(signedOut.shouldClearLegacy).toBe(true);

    const userBState = leoStateForAccount({
      previousUserId: null,
      nextUserId: userB,
      stores,
      newConversationId: 'conv-b-new',
    });
    expect(userBState.cache).toBeNull();
    expect(parseLeoConversationCache(stores[LEGACY_LEO_STORAGE_KEY], userB)).toBeNull();
  });

  it('Test C: User A recovers User A’s own cached conversation after logging back in', () => {
    const stores = {
      [leoConversationStorageKey(userA)]: cacheFor(userA, 'conv-a', 'User A thread'),
      [leoConversationStorageKey(userB)]: cacheFor(userB, 'conv-b', 'User B thread about calculus'),
    };
    const restored = leoStateForAccount({
      previousUserId: null,
      nextUserId: userA,
      stores,
      newConversationId: 'should-not-replace',
    });
    expect(restored.cache?.userId).toBe(userA);
    expect(restored.cache?.conversationId).toBe('conv-a');
    expect(restored.cache?.messages.map((item) => item.content)).toEqual(['User A thread']);
    expect(restored.cache?.messages.some((item) => item.content.includes('User B'))).toBe(false);
  });

  it('Test D: a stale in-flight User A response cannot modify User B state', () => {
    const userBMessages = [message('b1', 'User B question')];
    const staleFromA = [message('a1', 'Stale photosynthesis answer from User A')];
    const applyIfCurrent = (owner: string, current: string | null, incoming: ChatMessage[]) =>
      shouldApplyLeoResult(owner, current) ? incoming : userBMessages;
    expect(shouldApplyLeoResult(userA, userB)).toBe(false);
    expect(shouldApplyLeoResult(userA, null)).toBe(false);
    expect(shouldApplyLeoResult(userB, userB)).toBe(true);
    expect(applyIfCurrent(userA, userB, staleFromA)).toEqual(userBMessages);
    expect(applyIfCurrent(userB, userB, staleFromA)).toEqual(staleFromA);
  });

  it('Test E: server rejects User B using User A’s conversationId', () => {
    const access = conversationAccessDecision({
      conversationId: 'conv-a',
      requesterId: userB,
      existingOwners: [userA],
    });
    expect(access.allow).toBe(false);
    if (!access.allow) {
      expect(access.status).toBe(403);
      expect(access.code).toBe(CONVERSATION_FORBIDDEN_CODE);
      expect(access.code).toBe('conversation_forbidden');
      expect(access.error).not.toMatch(/photosynthesis/i);
    }
    const error = errorFromAiFailure({
      httpStatus: 403,
      code: 'conversation_forbidden',
      message: 'That conversation belongs to another account.',
    });
    expect(error).toBeInstanceOf(AccessError);
    expect(error.message).not.toMatch(/photosynthesis/i);
    expect(conversationAccessDecision({ conversationId: 'brand-new', requesterId: userB, existingOwners: [] }).allow).toBe(true);
    expect(conversationAccessDecision({ conversationId: 'conv-a', requesterId: userA, existingOwners: [userA] }).allow).toBe(true);
  });

  it('Test F: AI result retrieval cannot cross user boundaries', () => {
    const rows = [
      { id: 'gen-a', user_id: userA },
      { id: 'gen-b', user_id: userB },
    ];
    const get = (id: string, userId: string) => rows.find((row) => row.id === id && row.user_id === userId) ?? null;
    expect(get('gen-a', userB)).toBeNull();
    expect(generationBelongsToUser(get('gen-a', userB), userB)).toBe(false);
    expect(generationBelongsToUser({ user_id: userA }, userB)).toBe(false);
    expect(generationBelongsToUser({ userId: userB }, userB)).toBe(true);
    expect(generationBelongsToUser(get('gen-b', userB), userB)).toBe(true);
    expect(generationBelongsToUser(null, userB)).toBe(false);
  });

  it('never restores an unscoped legacy cache, even for the previous owner', () => {
    const raw = JSON.stringify({
      conversationId: 'global',
      messages: [message('m1', 'Leaked Leo conversation')],
    });
    expect(parseLeoConversationCache(raw, userA)).toBeNull();
    expect(leoConversationStorageKey(userA)).toBe(`studyflow.leo.conversation.v1:${userA}`);
    expect(leoConversationStorageKey(userA)).not.toBe(leoConversationStorageKey(userB));
  });

  it('keeps tester sample Leo data on the tester user only', () => {
    const seed = buildTesterSeed(new Date('2026-09-16T12:00:00Z'));
    const testerLeo = seed.ai.find((item) => item.kind === 'leo');
    const stores = {
      [LEGACY_LEO_STORAGE_KEY]: JSON.stringify({
        conversationId: 'tester-leo',
        messages: [message('t1', testerLeo?.prompt ?? '')],
      }),
      [leoConversationStorageKey('tester-id')]: serializeLeoConversationCache({
        userId: 'tester-id',
        conversationId: 'tester-leo',
        messages: [message('t1', testerLeo?.prompt ?? ''), message('t2', testerLeo?.resultText ?? '')],
      }),
    };
    const normal = leoStateForAccount({
      previousUserId: 'tester-id',
      nextUserId: userB,
      stores,
      newConversationId: 'normal-new',
    });
    expect(normal.cache).toBeNull();
    expect(parseLeoConversationCache(stores[leoConversationStorageKey('tester-id')], userB)).toBeNull();
  });
});
