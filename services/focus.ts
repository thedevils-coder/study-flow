import { isMissingColumnError } from '@/lib/errors';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { shouldRecordFocusSession } from '@/lib/validation';
import type { FocusSession, SessionType } from '@/types';

type SessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  session_type?: SessionType | null;
  created_at: string;
};

const selectWithType = 'id,user_id,started_at,ended_at,duration_seconds,session_type,created_at';
const selectWithoutType = 'id,user_id,started_at,ended_at,duration_seconds,created_at';

const mapSession = (row: SessionRow): FocusSession => ({
  id: row.id,
  userId: row.user_id,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  durationSeconds: row.duration_seconds,
  sessionType: row.session_type ?? 'focus',
  createdAt: row.created_at,
});

const inFlight = new Set<string>();

export const focusService = {
  async list(userId: string, start?: Date, end?: Date) {
    if (!isSupabaseConfigured) return [] as FocusSession[];
    const run = async (columns: string) => {
      let query = getSupabase()
        .from('focus_sessions')
        .select(columns)
        .eq('user_id', userId)
        .order('started_at', { ascending: false });
      if (start) query = query.gte('started_at', start.toISOString());
      if (end) query = query.lt('started_at', end.toISOString());
      return query;
    };

    let { data, error } = await run(selectWithType);
    if (error && isMissingColumnError(error)) {
      ({ data, error } = await run(selectWithoutType));
    }
    if (error) throw error;
    return ((data ?? []) as unknown as SessionRow[]).map(mapSession);
  },

  async recordCompleted(input: {
    userId: string;
    startedAt: Date;
    endedAt?: Date;
    durationSeconds: number;
    sessionType?: SessionType;
    completedNaturally: boolean;
    reset?: boolean;
    alreadyRecorded?: boolean;
  }) {
    if (
      !shouldRecordFocusSession({
        completedNaturally: input.completedNaturally,
        reset: Boolean(input.reset),
        alreadyRecorded: Boolean(input.alreadyRecorded),
        durationSeconds: input.durationSeconds,
      })
    ) {
      return null;
    }

    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

    const key = `${input.userId}:${input.startedAt.toISOString()}`;
    if (inFlight.has(key)) return null;
    inFlight.add(key);

    try {
      const endedAt = input.endedAt ?? new Date();
      const row = {
        user_id: input.userId,
        started_at: input.startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_seconds: input.durationSeconds,
        session_type: input.sessionType ?? 'focus',
      };
      let { data, error } = await getSupabase().from('focus_sessions').insert(row).select(selectWithType).single();
      if (error && isMissingColumnError(error)) {
        const { session_type: _ignored, ...withoutType } = row;
        ({ data, error } = await getSupabase()
          .from('focus_sessions')
          .insert(withoutType)
          .select(selectWithoutType)
          .single());
      }
      if (error) throw error;
      return mapSession(data as SessionRow);
    } finally {
      inFlight.delete(key);
    }
  },

  activityDays(sessions: FocusSession[]) {
    const days = new Set<string>();
    for (const session of sessions) {
      const date = new Date(session.startedAt);
      days.add(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
          date.getDate(),
        ).padStart(2, '0')}`,
      );
    }
    return Array.from(days);
  },
};
