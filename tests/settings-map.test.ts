import { describe, expect, it } from 'vitest';

import { defaultSettings, mapSettings, settingsUpsertPayload } from '@/lib/settings-map';

describe('settings mapping', () => {
  it('fills defaults from a sparse user_settings row', () => {
    const mapped = mapSettings({
      user_id: 'user-1',
      language: 'en',
      updated_at: '2026-09-16T12:00:00.000Z',
    } as Parameters<typeof mapSettings>[0]);
    expect(mapped.notificationsEnabled).toBe(true);
    expect(mapped.taskReminders).toBe(true);
    expect(mapped.focusMinutes).toBe(25);
    expect(mapped.theme).toBe('system');
  });

  it('prefers dedicated columns over the reminders jsonb', () => {
    const mapped = mapSettings({
      user_id: 'user-1',
      notifications_enabled: false,
      study_reminders: false,
      task_reminders: false,
      goal_reminders: true,
      reminders: { taskReminders: true },
      theme: 'dark',
      focus_minutes: 40,
      updated_at: '2026-09-16T12:00:00.000Z',
    });
    expect(mapped.notificationsEnabled).toBe(false);
    expect(mapped.taskReminders).toBe(false);
    expect(mapped.focusMinutes).toBe(40);
    expect(mapped.theme).toBe('dark');
  });

  it('writes both column and jsonb reminder flags', () => {
    const payload = settingsUpsertPayload({
      ...defaultSettings('user-1'),
      notificationsEnabled: false,
      taskReminders: false,
    });
    expect(payload.notifications_enabled).toBe(false);
    expect(payload.task_reminders).toBe(false);
    expect(payload.reminders).toMatchObject({ taskReminders: false, notificationsEnabled: false });
  });
});
