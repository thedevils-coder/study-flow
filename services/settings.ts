import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ThemePreference, UserSettings } from '@/types';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const defaults = (userId: string): UserSettings => ({
  userId,
  theme: 'system',
  notificationsEnabled: true,
  studyReminders: true,
  taskReminders: true,
  goalReminders: true,
  focusMinutes: 25,
  updatedAt: new Date().toISOString(),
});

type SettingsRow = {
  user_id: string;
  theme: string | null;
  notifications_enabled: boolean | null;
  study_reminders: boolean | null;
  goal_reminders: boolean | null;
  focus_minutes: number | null;
  reminders: Record<string, unknown> | null;
  updated_at: string;
};

const mapSettings = (row: SettingsRow): UserSettings => ({
  userId: row.user_id,
  theme: (row.theme as ThemePreference) || 'system',
  notificationsEnabled: row.notifications_enabled ?? true,
  studyReminders: row.study_reminders ?? true,
  taskReminders: Boolean(row.reminders?.taskReminders ?? true),
  goalReminders: row.goal_reminders ?? true,
  focusMinutes: row.focus_minutes ?? 25,
  updatedAt: row.updated_at,
});

export const settingsService = {
  async load(userId: string) {
    if (!isSupabaseConfigured) return defaults(userId);
    const { data, error } = await getSupabase()
      .from('user_settings')
      .select(
        'user_id,theme,notifications_enabled,study_reminders,goal_reminders,focus_minutes,reminders,updated_at',
      )
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return defaults(userId);
    return mapSettings(data as SettingsRow);
  },

  async save(userId: string, patch: Partial<UserSettings>) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const current = await this.load(userId);
    const next: UserSettings = { ...current, ...patch, userId, updatedAt: new Date().toISOString() };
    const { error } = await getSupabase().from('user_settings').upsert({
      user_id: userId,
      theme: next.theme,
      notifications_enabled: next.notificationsEnabled,
      study_reminders: next.studyReminders,
      goal_reminders: next.goalReminders,
      focus_minutes: next.focusMinutes,
      reminders: { taskReminders: next.taskReminders },
      updated_at: next.updatedAt,
    });
    if (error) throw error;
    return next;
  },
};

export const notificationService = {
  async requestPermission() {
    if (Platform.OS === 'web') {
      return { granted: false, message: 'Reminders are available in the Android app.' };
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return { granted: true, message: 'Reminders are on.' };
    const asked = await Notifications.requestPermissionsAsync();
    if (asked.granted) return { granted: true, message: 'Reminders are on.' };
    return {
      granted: false,
      message:
        'Notification permission is off. Enable it in system settings to receive study and task reminders.',
    };
  },

  async scheduleTaskReminder(taskId: string, title: string, when: Date) {
    if (Platform.OS === 'web' || when.getTime() <= Date.now()) return;
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
};
