export const BASIC_DAILY_AI_LIMIT = 20;
export const PRO_DAILY_AI_LIMIT = 80;
export const RESERVATION_LEASE_MS = 10 * 60 * 1000;

export type QuotaPlan = 'basic' | 'pro';

export type SuccessGeneration = {
  id: string;
  userId: string;
  status: 'success' | 'failed' | 'error';
  createdAt: number;
};

export type QuotaReservation = {
  id: string;
  userId: string;
  dayStart: number;
  createdAt: number;
  expiresAt: number;
};

export type QuotaStore = {
  generations: SuccessGeneration[];
  reservations: QuotaReservation[];
};

export type ReserveResult =
  | { allowed: true; id: string; used: number; remaining: number; limit: number }
  | { allowed: false; id: null; used: number; remaining: 0; limit: number };

export function dailyAiLimitForPlan(plan: QuotaPlan) {
  return plan === 'pro' ? PRO_DAILY_AI_LIMIT : BASIC_DAILY_AI_LIMIT;
}

export function utcDayStartMs(now: number) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start.getTime();
}

export function expireReservations(store: QuotaStore, now: number, userId?: string) {
  store.reservations = store.reservations.filter((row) => {
    if (userId && row.userId !== userId) return true;
    return row.expiresAt > now;
  });
}

export function countQuotaUsage(store: QuotaStore, userId: string, now: number) {
  const dayStart = utcDayStartMs(now);
  const success = store.generations.filter(
    (row) => row.userId === userId && row.status === 'success' && row.createdAt >= dayStart,
  ).length;
  const reserved = store.reservations.filter(
    (row) => row.userId === userId && row.dayStart === dayStart && row.expiresAt > now,
  ).length;
  return { success, reserved, used: success + reserved, dayStart };
}

export function reserveQuotaSlot(
  store: QuotaStore,
  input: { userId: string; plan: QuotaPlan; now: number; id: string; leaseMs?: number },
): ReserveResult {
  expireReservations(store, input.now, input.userId);
  const limit = dailyAiLimitForPlan(input.plan);
  const usage = countQuotaUsage(store, input.userId, input.now);
  if (usage.used >= limit) {
    return { allowed: false, id: null, used: usage.used, remaining: 0, limit };
  }
  store.reservations.push({
    id: input.id,
    userId: input.userId,
    dayStart: usage.dayStart,
    createdAt: input.now,
    expiresAt: input.now + (input.leaseMs ?? RESERVATION_LEASE_MS),
  });
  return {
    allowed: true,
    id: input.id,
    used: usage.used + 1,
    remaining: limit - usage.used - 1,
    limit,
  };
}

export function releaseQuotaSlot(store: QuotaStore, id: string, userId: string) {
  const before = store.reservations.length;
  store.reservations = store.reservations.filter((row) => !(row.id === id && row.userId === userId));
  return store.reservations.length < before;
}

export function storeSuccessfulGeneration(
  store: QuotaStore,
  input: { id: string; userId: string; now: number; reservationId?: string | null },
) {
  store.generations.push({
    id: input.id,
    userId: input.userId,
    status: 'success',
    createdAt: input.now,
  });
  if (input.reservationId) releaseQuotaSlot(store, input.reservationId, input.userId);
}

export function failGeneration(store: QuotaStore, reservationId: string, userId: string) {
  return releaseQuotaSlot(store, reservationId, userId);
}

/** Serializes per-user reservations the same way pg_advisory_xact_lock does. */
export function createLockedQuotaStore(store: QuotaStore = { generations: [], reservations: [] }) {
  const tails = new Map<string, Promise<unknown>>();

  const withLock = async <T>(userId: string, fn: () => T | Promise<T>): Promise<T> => {
    const previous = tails.get(userId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    tails.set(
      userId,
      previous.then(
        () => current,
        () => current,
      ),
    );
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  };

  return {
    store,
    reserve(userId: string, plan: QuotaPlan, now: number, id: string) {
      return withLock(userId, () => reserveQuotaSlot(store, { userId, plan, now, id }));
    },
    release(id: string, userId: string) {
      return releaseQuotaSlot(store, id, userId);
    },
    succeed(id: string, userId: string, now: number, reservationId?: string | null) {
      return storeSuccessfulGeneration(store, { id, userId, now, reservationId });
    },
    fail(reservationId: string, userId: string) {
      return failGeneration(store, reservationId, userId);
    },
  };
}
