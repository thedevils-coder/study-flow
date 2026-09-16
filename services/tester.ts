import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, isTesterPasswordConfigured, publicConfig } from '@/lib/config';
import { ConfigurationError } from '@/lib/errors';
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
import { authService } from '@/services/auth';
import { settingsService } from '@/services/settings';
import { updateDisplayName } from '@/services/profile';
import type { UserSession } from '@/types';

const seedKey = (userId: string) => `studyflow.tester-seed.${userId}`;

async function signInExistingTester(email: string, password: string) {
  return authService.signInWithPassword(email, password);
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
      const session = await signInExistingTester(email, password);
      if (!session) throw new Error('Tester sign-in did not return a session.');
      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!/invalid login credentials|invalid_credentials/i.test(message)) {
        throw error;
      }
    }

    try {
      const created = await authService.signUpWithPassword(email, password, TESTER_DISPLAY_NAME);
      if (created.session) return created.session;
      if (created.needsVerification) {
        throw new ConfigurationError(
          'The tester account was created but Supabase is waiting for email confirmation. Disable Confirm email in Supabase Auth for preview, or confirm tester@getstudyflow.in once, then tap Tester / Demo Account again.',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/already (been )?registered|user already/i.test(message)) {
        throw new ConfigurationError(
          'A tester user already exists, but this build’s tester password does not match. Set EXPO_PUBLIC_TESTER_PASSWORD to that account’s password, or reset the tester user in Supabase Auth.',
        );
      }
      throw error;
    }

    const retry = await signInExistingTester(email, password);
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
      const message = rpc.error.message ?? '';
      const functionMissing = /could not find the function|does not exist|schema cache/i.test(message);
      if (!functionMissing) throw rpc.error;
      await clearOwnedData(userId);
      await updateDisplayName(userId, TESTER_DISPLAY_NAME);
    }

    const seed = buildTesterSeed();
    const client = getSupabase();

    if (seed.tasks.length) {
      const { error } = await client.from('study_tasks').insert(
        seed.tasks.map((task) => ({
          user_id: userId,
          title: task.title,
          scheduled_at: task.scheduledAt,
          category: task.category,
          completed_at: task.completedAt,
          updated_at: task.completedAt ?? task.scheduledAt,
        })),
      );
      if (error) throw error;
    }

    if (seed.goals.length) {
      const { error } = await client.from('study_goals').insert(
        seed.goals.map((goal) => ({
          user_id: userId,
          title: goal.title,
          target_value: goal.targetValue,
          current_value: goal.currentValue,
          unit: goal.unit,
          due_at: goal.dueAt,
        })),
      );
      if (error) throw error;
    }

    if (seed.sessions.length) {
      const { error } = await client.from('focus_sessions').insert(
        seed.sessions.map((item) => ({
          user_id: userId,
          started_at: item.startedAt,
          ended_at: item.endedAt,
          duration_seconds: item.durationSeconds,
          session_type: item.sessionType,
        })),
      );
      if (error) throw error;
    }

    if (seed.ai.length) {
      const { error } = await client.from('ai_generations').insert(
        seed.ai.map((item) => ({
          user_id: userId,
          kind: item.kind,
          prompt: item.prompt,
          result_text: item.resultText,
          result_meta: { tester: true, seedVersion: TESTER_SEED_VERSION },
          created_at: item.createdAt,
        })),
      );
      if (error) throw error;
    }

    await settingsService.save(userId, {
      theme: 'system',
      notificationsEnabled: true,
      studyReminders: true,
      taskReminders: true,
      goalReminders: true,
      focusMinutes: 25,
    });

    await AsyncStorage.setItem(seedKey(userId), String(TESTER_SEED_VERSION));
  },
};

async function clearOwnedData(userId: string) {
  const client = getSupabase();
  const tables = [
    'study_tasks',
    'study_goals',
    'focus_sessions',
    'ai_generations',
    'user_achievements',
  ] as const;

  for (const table of tables) {
    const { error } = await client.from(table).delete().eq('user_id', userId);
    if (error) throw error;
  }
}
