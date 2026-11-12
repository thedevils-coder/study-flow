import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, isTesterPasswordConfigured, publicConfig } from '@/lib/config';
import { ConfigurationError, extractErrorMessage, isMissingRelationError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import {
  TESTER_COPY,
  TESTER_DISPLAY_NAME,
  TESTER_SEED_VERSION,
  isTesterBuildEnabled,
  isTesterEmail,
  testerEmail,
} from '@/lib/tester';
import { buildTesterSeed } from '@/lib/tester-seed';
import { authService, toSession } from '@/services/auth';
import { settingsService } from '@/services/settings';
import { updateDisplayName } from '@/services/profile';
import type { UserSession } from '@/types';

const seedKey = (userId: string) => `studyflow.tester-seed.${userId}`;

function asError(error: unknown, fallback: string) {
  const message = extractErrorMessage(error) || fallback;
  if (error instanceof Error) {
    error.message = message;
    return error;
  }
  return new Error(message);
}

export const testerService = {
  isAvailable() {
    return isTesterBuildEnabled();
  },

  configured() {
    return isSupabaseConfigured && isTesterPasswordConfigured;
  },

  async signIn(): Promise<UserSession> {
    if (!isTesterBuildEnabled()) {
      throw new ConfigurationError(TESTER_COPY.productionHidden);
    }
    if (!isSupabaseConfigured) {
      throw new ConfigurationError(
        'Supabase is not configured on this device. Add the public project URL and publishable key to continue.',
      );
    }
    if (!isTesterPasswordConfigured) {
      throw new ConfigurationError(TESTER_COPY.missingPassword);
    }

    const email = testerEmail();
    const password = publicConfig.testerPassword;

    try {
      const session = await authService.signInWithPassword(email, password);
      if (!session) throw new Error('Tester sign-in did not return a session.');
      return session;
    } catch (error) {
      const message = extractErrorMessage(error);
      if (!/invalid login credentials|invalid_credentials/i.test(message)) {
        throw asError(error, 'Unable to sign in as the tester.');
      }
    }

    try {
      const { data, error } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          data: { display_name: TESTER_DISPLAY_NAME },
        },
      });
      if (error) throw error;
      if (data.session?.user) return toSession(data.session.user);
      if (data.user && !data.session) {
        throw new ConfigurationError(
          'The tester account was created but Supabase is waiting for email confirmation. Disable Confirm email in Supabase Auth for preview, or confirm tester@getstudyflow.in once, then tap Tester / Demo Account again.',
        );
      }
    } catch (error) {
      const message = extractErrorMessage(error);
      if (/already (been )?registered|user already/i.test(message)) {
        throw new ConfigurationError(
          'A tester user already exists, but this build’s tester password does not match. Set EXPO_PUBLIC_TESTER_PASSWORD to that account’s password, or reset the tester user in Supabase Auth.',
        );
      }
      if (error instanceof ConfigurationError) throw error;
      throw asError(error, 'Unable to create the tester account.');
    }

    const retry = await authService.signInWithPassword(email, password);
    if (!retry) {
      throw new ConfigurationError(
        'Unable to open the tester session. Check that the tester password matches the user in Supabase Auth.',
      );
    }
    return retry;
  },

  async ensureSeeded(session: UserSession) {
    if (!isTesterEmail(session.email)) return;
    const stored = await AsyncStorage.getItem(seedKey(session.id));
    if (stored === String(TESTER_SEED_VERSION)) return;
    await this.reseed(session.id);
  },

  async reseed(userId: string) {
    if (!isSupabaseConfigured) {
      throw new ConfigurationError('Supabase is not configured.');
    }

    const rpc = await getSupabase().rpc('reset_tester_data');
    if (rpc.error) {
      const message = extractErrorMessage(rpc.error);
      const canFallback =
        /could not find the function|schema cache|PGRST202/i.test(message) || isMissingRelationError(rpc.error);
      if (!canFallback) throw asError(rpc.error, 'Unable to reset tester data.');
      await clearOwnedData(userId);
      try {
        await updateDisplayName(userId, TESTER_DISPLAY_NAME);
      } catch (error) {
        if (!isMissingRelationError(error)) throw asError(error, 'Unable to update the tester profile.');
      }
    }

    const seed = buildTesterSeed();

    await insertRows(
      'study_tasks',
      seed.tasks.map((task) => ({
        user_id: userId,
        title: task.title,
        scheduled_at: task.scheduledAt,
        category: task.category,
        completed_at: task.completedAt,
        updated_at: task.completedAt ?? task.scheduledAt,
      })),
    );

    await insertRows(
      'study_goals',
      seed.goals.map((goal) => ({
        user_id: userId,
        title: goal.title,
        target_value: goal.targetValue,
        current_value: goal.currentValue,
        unit: goal.unit,
        due_at: goal.dueAt,
      })),
    );

    await insertRows(
      'focus_sessions',
      seed.sessions.map((item) => ({
        user_id: userId,
        started_at: item.startedAt,
        ended_at: item.endedAt,
        duration_seconds: item.durationSeconds,
        session_type: item.sessionType,
      })),
    );

    await insertRows(
      'ai_generations',
      seed.ai.map((item) => ({
        user_id: userId,
        kind: item.kind,
        prompt: item.prompt,
        result_text: item.resultText,
        result_meta: { tester: true, seedVersion: TESTER_SEED_VERSION },
        created_at: item.createdAt,
      })),
    );

    try {
      await settingsService.save(userId, {
        theme: 'system',
        notificationsEnabled: true,
        studyReminders: true,
        taskReminders: true,
        goalReminders: true,
        focusMinutes: 25,
      });
    } catch (error) {
      if (!isMissingRelationError(error)) throw asError(error, 'Unable to save tester settings.');
    }

    await AsyncStorage.setItem(seedKey(userId), String(TESTER_SEED_VERSION));
  },
};

async function insertRows(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const { error } = await getSupabase().from(table).insert(rows);
  if (!error) return;
  if (isMissingRelationError(error) || /session_type/i.test(extractErrorMessage(error))) {
    if (/session_type/i.test(extractErrorMessage(error))) {
      const { error: retryError } = await getSupabase()
        .from(table)
        .insert(rows.map(({ session_type: _ignored, ...row }) => row));
      if (!retryError || isMissingRelationError(retryError)) return;
      throw asError(retryError, `Unable to seed ${table}.`);
    }
    return;
  }
  throw asError(error, `Unable to seed ${table}.`);
}

async function clearOwnedData(userId: string) {
  const tables = [
    'study_tasks',
    'study_goals',
    'focus_sessions',
    'ai_generations',
    'user_achievements',
  ] as const;

  for (const table of tables) {
    const { error } = await getSupabase().from(table).delete().eq('user_id', userId);
    if (error && !isMissingRelationError(error)) throw asError(error, `Unable to clear ${table}.`);
  }
}
