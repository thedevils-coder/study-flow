import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { ConfigurationError, extractErrorMessage, isMissingColumnError, isMissingRelationError } from '@/lib/errors';
import { isExpoGo } from '@/lib/runtime';
import {
  defaultSettings,
  mapSettings,
  settingsSchemaMessage,
  settingsUpsertPayload,
  type SettingsRow,
} from '@/lib/settings-map';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { StudyGoal, Task, UserSettings } from '@/types';

const localKey = (userId: string) => `studyflow.settings.${userId}`;
let handlerReady = false;

async function readLocal(userId: string): Promise<UserSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(localKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSettings;
    if (!parsed || parsed.userId !== userId) return null;
    return { ...defaultSettings(userId), ...parsed, userId };
  } catch {
    return null;
  }
}

async function writeLocal(settings: UserSettings) {
  await AsyncStorage.setItem(localKey(settings.userId), JSON.stringify(settings));
}

function notificationUnavailableMessage() {
  if (Platform.OS === 'web') return 'Reminders are available in the Android app.';
  if (isExpoGo()) {
    return 'Expo Go can schedule local reminders only. If scheduling fails, use an EAS development or preview build. Remote push was removed from Expo Go in SDK 53.';
  }
  return 'Notification permission is off. Enable it in system settings to receive study and task reminders.';
}

export const settingsService = {
  async load(userId: string) {
    const local = await readLocal(userId);
    if (!isSupabaseConfigured) return local ?? defaultSettings(userId);

    const client = getSupabase();
    let { data, error } = await client
      .from('user_settings')
      .select(
        'user_id,theme,notifications_enabled,study_reminders,goal_reminders,task_reminders,focus_minutes,reminders,updated_at',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error && (isMissingColumnError(error) || isMissingRelationError(error))) {
      const retry = await client.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
      data = retry.data;
      error = retry.error && isMissingRelationError(retry.error) ? null : retry.error;
    }

    if (error) {
      if (isMissingColumnError(error) || isMissingRelationError(error)) {
        return local ?? defaultSettings(userId);
      }
      throw error;
    }

    if (!data) return local ?? defaultSettings(userId);
    const remote = mapSettings(data as SettingsRow);
    await writeLocal(remote);
    return remote;
  },

  async save(userId: string, patch: Partial<UserSettings>) {
    const current = await this.load(userId);
    const next: UserSettings = { ...current, ...patch, userId, updatedAt: new Date().toISOString() };
    await writeLocal(next);

    if (!isSupabaseConfigured) {
      const error = new ConfigurationError('Supabase is not configured.');
      error.savedSettings = next;
      throw error;
    }

    const payload = settingsUpsertPayload(next);
    let { error } = await getSupabase().from('user_settings').upsert(payload);

    if (error && (isMissingColumnError(error) || isMissingRelationError(error))) {
      const reduced = {
        user_id: next.userId,
        language: 'en',
        updated_at: next.updatedAt,
      };
      const retry = await getSupabase().from('user_settings').upsert(reduced);
      const wrapped = new ConfigurationError(settingsSchemaMessage(error));
      wrapped.savedSettings = next;
      if (retry.error && !isMissingRelationError(retry.error) && !isMissingColumnError(retry.error)) {
        wrapped.message = `${wrapped.message} ${extractErrorMessage(retry.error)}`;
      }
      throw wrapped;
    }

    if (error) {
      const wrapped = new ConfigurationError(extractErrorMessage(error) || 'Unable to save settings.');
      wrapped.savedSettings = next;
      throw wrapped;
    }

    return next;
  },
};

export const notificationService = {
  async prepare() {
    if (Platform.OS === 'web' || handlerReady) return;
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      handlerReady = true;
    } catch (error) {
      handlerReady = false;
      throw error;
    }
  },

  capabilityMessage() {
    return notificationUnavailableMessage();
  },

  isExpoGo: isExpoGo,

  async requestPermission() {
    if (Platform.OS === 'web') {
      return { granted: false, message: 'Reminders are available in the Android app.' };
    }
    try {
      await this.prepare();
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return { granted: true, message: 'Reminders are on.' };
      const asked = await Notifications.requestPermissionsAsync();
      if (asked.granted) return { granted: true, message: 'Reminders are on.' };
      return { granted: false, message: notificationUnavailableMessage() };
    } catch (error) {
      return {
        granted: false,
        message: extractErrorMessage(error) || notificationUnavailableMessage(),
      };
    }
  },

  async cancelAll() {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // Expo Go or missing native module should not crash settings.
    }
  },

  async scheduleTaskReminder(taskId: string, title: string, when: Date) {
    if (Platform.OS === 'web' || when.getTime() <= Date.now()) return;
    await this.prepare().catch(() => undefined);
    await Notifications.cancelScheduledNotificationAsync(`task:${taskId}`).catch(() => undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: `task:${taskId}`,
      content: {
        title: 'Upcoming task',
        body: title,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
      },
    });
  },

  async cancelTaskReminder(taskId: string) {
    if (Platform.OS === 'web') return;
    await Notifications.cancelScheduledNotificationAsync(`task:${taskId}`).catch(() => undefined);
  },

  async applyReminders(input: { settings: UserSettings | null; tasks: Task[]; goals: StudyGoal[] }) {
    if (Platform.OS === 'web') return { scheduled: 0, cancelled: true };
    const settings = input.settings;
    try {
      await this.prepare();
    } catch (error) {
      throw new ConfigurationError(extractErrorMessage(error) || notificationUnavailableMessage());
    }

    await this.cancelAll();
    if (!settings?.notificationsEnabled) {
      return { scheduled: 0, cancelled: true };
    }

    const permission = await this.requestPermission();
    if (!permission.granted) {
      throw new ConfigurationError(permission.message);
    }

    let scheduled = 0;

    if (settings.studyReminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: 'study-daily',
        content: {
          title: 'Study reminder',
          body: 'A focused block now will keep your streak moving.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 18,
          minute: 0,
        },
      });
      scheduled += 1;
    }

    if (settings.taskReminders) {
      for (const task of input.tasks) {
        if (!task.scheduledAt || task.completed) continue;
        const when = new Date(task.scheduledAt);
        if (when.getTime() <= Date.now()) continue;
        await this.scheduleTaskReminder(task.id, task.title, when);
        scheduled += 1;
      }
    }

    if (settings.goalReminders) {
      for (const goal of input.goals) {
        if (!goal.dueAt) continue;
        const due = new Date(goal.dueAt);
        due.setHours(9, 0, 0, 0);
        if (due.getTime() <= Date.now()) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: `goal:${goal.id}`,
          content: {
            title: 'Goal reminder',
            body: goal.title,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: due,
          },
        });
        scheduled += 1;
      }
    }

    return { scheduled, cancelled: false };
  },
};
