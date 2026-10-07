import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ThemePreference, UserSettings } from '@/types';

const defaults = (userId: string): UserSettings => ({
  userId,
  theme: 'system',
  notificationsEnabled: false,
  studyReminders: false,
  taskReminders: false,
  goalReminders: false,
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
  notificationsEnabled: false,
  studyReminders: false,
  taskReminders: false,
  goalReminders: false,
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
    const next: UserSettings = {
      ...current,
      ...patch,
      userId,
      notificationsEnabled: false,
      studyReminders: false,
      taskReminders: false,
      goalReminders: false,
      updatedAt: new Date().toISOString(),
    };
    const { error } = await getSupabase().from('user_settings').upsert({
      user_id: userId,
      theme: next.theme,
      notifications_enabled: false,
      study_reminders: false,
      goal_reminders: false,
      focus_minutes: next.focusMinutes,
      reminders: { taskReminders: false },
      updated_at: next.updatedAt,
    });
    if (error) throw error;
    return next;
  },
};
