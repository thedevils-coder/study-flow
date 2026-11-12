import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BASIC_DAILY_AI_LIMIT,
  PRO_DAILY_AI_LIMIT,
  RESERVATION_LEASE_MS,
  countQuotaUsage,
  createLockedQuotaStore,
  expireReservations,
  failGeneration,
  reserveQuotaSlot,
  storeSuccessfulGeneration,
  type QuotaStore,
} from '@/lib/ai-quota';

const now = Date.UTC(2026, 10, 12, 15, 0, 0);

function emptyStore(): QuotaStore {
  return { generations: [], reservations: [] };
}

describe('atomic AI quota reservations', () => {
  it('enforces the Basic daily limit of 20 successful generations', () => {
    const store = emptyStore();
    for (let i = 0; i < BASIC_DAILY_AI_LIMIT; i += 1) {
      const reserved = reserveQuotaSlot(store, { userId: 'basic', plan: 'basic', now, id: `r${i}` });
      expect(reserved.allowed).toBe(true);
      storeSuccessfulGeneration(store, { id: `g${i}`, userId: 'basic', now, reservationId: `r${i}` });
    }
    expect(countQuotaUsage(store, 'basic', now).success).toBe(20);
    expect(reserveQuotaSlot(store, { userId: 'basic', plan: 'basic', now, id: 'blocked' })).toEqual({
      allowed: false,
      id: null,
      used: 20,
      remaining: 0,
      limit: BASIC_DAILY_AI_LIMIT,
    });
  });

  it('enforces the Pro daily limit of 80 successful generations', () => {
    const store = emptyStore();
    for (let i = 0; i < PRO_DAILY_AI_LIMIT; i += 1) {
      const reserved = reserveQuotaSlot(store, { userId: 'pro', plan: 'pro', now, id: `r${i}` });
      expect(reserved.allowed).toBe(true);
      storeSuccessfulGeneration(store, { id: `g${i}`, userId: 'pro', now, reservationId: `r${i}` });
    }
    expect(reserveQuotaSlot(store, { userId: 'pro', plan: 'pro', now, id: 'blocked' }).allowed).toBe(false);
    expect(countQuotaUsage(store, 'pro', now)).toMatchObject({ success: 80, reserved: 0, used: 80 });
  });

  it('does not let concurrent reservations exceed the plan limit', async () => {
    const locked = createLockedQuotaStore();
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, index) => locked.reserve('basic', 'basic', now, `c${index}`)),
    );
    const allowed = results.filter((row) => row.allowed);
    const denied = results.filter((row) => !row.allowed);
    expect(allowed).toHaveLength(BASIC_DAILY_AI_LIMIT);
    expect(denied).toHaveLength(20);
    expect(locked.store.reservations).toHaveLength(BASIC_DAILY_AI_LIMIT);
  });

  it('releases a failed generation so it does not count against the successful quota', () => {
    const store = emptyStore();
    const reserved = reserveQuotaSlot(store, { userId: 'basic', plan: 'basic', now, id: 'fail-me' });
    expect(reserved.allowed).toBe(true);
    expect(failGeneration(store, 'fail-me', 'basic')).toBe(true);
    store.generations.push({ id: 'failed-row', userId: 'basic', status: 'failed', createdAt: now });
    expect(countQuotaUsage(store, 'basic', now)).toEqual({ success: 0, reserved: 0, used: 0, dayStart: utcDay(now) });
    expect(reserveQuotaSlot(store, { userId: 'basic', plan: 'basic', now, id: 'next' }).allowed).toBe(true);
  });

  it('counts a successful generation once after the reservation is released', () => {
    const store = emptyStore();
    const reserved = reserveQuotaSlot(store, { userId: 'basic', plan: 'basic', now, id: 'hold' });
    expect(reserved).toMatchObject({ allowed: true, used: 1, remaining: 19, limit: 20 });
    storeSuccessfulGeneration(store, { id: 'gen', userId: 'basic', now, reservationId: 'hold' });
    expect(countQuotaUsage(store, 'basic', now)).toEqual({ success: 1, reserved: 0, used: 1, dayStart: utcDay(now) });
  });

  it('does not let expired reservations block future requests', () => {
    const store = emptyStore();
    reserveQuotaSlot(store, {
      userId: 'basic',
      plan: 'basic',
      now,
      id: 'stale',
      leaseMs: RESERVATION_LEASE_MS,
    });
    const later = now + RESERVATION_LEASE_MS + 1;
    expireReservations(store, later, 'basic');
    expect(countQuotaUsage(store, 'basic', later).used).toBe(0);
    const next = reserveQuotaSlot(store, { userId: 'basic', plan: 'basic', now: later, id: 'fresh' });
    expect(next.allowed).toBe(true);
  });
});

describe('ai-generate quota wiring', () => {
  it('reserves atomically, releases after storeSuccess, and cleans up in finally for stream and non-stream', () => {
    const source = readFileSync(path.resolve(__dirname, '../supabase/functions/ai-generate/index.ts'), 'utf8');
    const migration = readFileSync(
      path.resolve(__dirname, '../supabase/migrations/202611120003_ai_generation_reservations.sql'),
      'utf8',
    );
    expect(source).toMatch(/reserve_ai_generation_slot/);
    expect(source).toMatch(/release_ai_generation_slot/);
    expect(source).toMatch(/await releaseHold\(\);/);
    expect(source).toMatch(/} finally \{\s*await releaseHold\(\);/);
    expect(source).toMatch(/} finally \{\s*if \(!streamingResponse\) await releaseHold\(\);/);
    expect(source).toMatch(/eq\('status', 'success'\)/);
    expect(migration).toMatch(/pg_advisory_xact_lock/);
    expect(migration).toMatch(/interval '10 minutes'/);
    expect(migration).toMatch(/status = 'success'/);
    expect(migration).toMatch(/grant execute on function public.reserve_ai_generation_slot\(uuid, text\) to service_role/);
    expect(migration).toMatch(/revoke all on function public.reserve_ai_generation_slot\(uuid, text\) from anon, authenticated|revoke all on function public.reserve_ai_generation_slot\(uuid, text\) from %I/);
    expect(migration).not.toMatch(/grant execute on function public.reserve_ai_generation_slot\(uuid, text\) to authenticated/);
    expect(migration).not.toMatch(/grant execute on function public.reserve_ai_generation_slot\(uuid, text\) to anon/);
  });
});

function utcDay(value: number) {
  const start = new Date(value);
  start.setUTCHours(0, 0, 0, 0);
  return start.getTime();
}
