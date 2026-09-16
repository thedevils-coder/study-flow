import { extractErrorMessage, isMissingColumnError, isMissingRelationError } from '@/lib/errors';
import type { ThemePreference, UserSettings } from '@/types';

export type SettingsRow = {
  user_id: string;
  theme?: string | null;
  notifications_enabled?: boolean | null;
  study_reminders?: boolean | null;
  task_reminders?: boolean | null;
  goal_reminders?: boolean | null;
  focus_minutes?: number | null;
  reminders?: Record<string, unknown> | null;
  updated_at?: string | null;
};

export const defaultSettings = (userId: string): UserSettings => ({
  userId,
  theme: 'system',
  notificationsEnabled: true,
  studyReminders: true,
  taskReminders: true,
  goalReminders: true,
  focusMinutes: 25,
  updatedAt: new Date().toISOString(),
});

export function mapSettings(row: SettingsRow): UserSettings {
  const reminders = row.reminders ?? {};
  return {
    userId: row.user_id,
    theme: (row.theme as ThemePreference) || 'system',
    notificationsEnabled: row.notifications_enabled ?? true,
    studyReminders: row.study_reminders ?? true,
    taskReminders:
      row.task_reminders ??
      (typeof reminders.taskReminders === 'boolean' ? reminders.taskReminders : true),
    goalReminders: row.goal_reminders ?? true,
    focusMinutes: row.focus_minutes ?? 25,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export function settingsUpsertPayload(settings: UserSettings) {
  return {
    user_id: settings.userId,
    theme: settings.theme,
    notifications_enabled: settings.notificationsEnabled,
    study_reminders: settings.studyReminders,
    goal_reminders: settings.goalReminders,
    task_reminders: settings.taskReminders,
    focus_minutes: settings.focusMinutes,
    reminders: {
      taskReminders: settings.taskReminders,
      studyReminders: settings.studyReminders,
      goalReminders: settings.goalReminders,
      notificationsEnabled: settings.notificationsEnabled,
    },
    updated_at: settings.updatedAt,
  };
}

export function isSettingsSchemaError(error: unknown) {
  return isMissingRelationError(error) || isMissingColumnError(error);
}

export function settingsSchemaMessage(error: unknown) {
  const detail = extractErrorMessage(error);
  return [
    'Could not persist settings to Supabase.',
    detail,
    'Apply supabase/migrations/202609160002_align_existing_project.sql, then toggle again to sync your account.',
  ]
    .filter(Boolean)
    .join(' ');
}
