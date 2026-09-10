import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { UserSettings } from '@/types';
import { t } from '@/i18n';

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

export async function syncLocalReminders(settings: UserSettings): Promise<'granted' | 'denied' | 'skipped'> {
  if (Platform.OS === 'web') {
    return 'skipped';
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!settings.notificationsEnabled) {
      return 'skipped';
    }

    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      return 'denied';
    }

    const language = settings.language || 'en';

    if (settings.studyReminders) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t(language, 'studyReminders'),
          body: t(language, 'studyReminderBody'),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 18,
          minute: 0,
        },
      });
    }

    if (settings.goalReminders) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t(language, 'goalReminders'),
          body: t(language, 'goalReminderBody'),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 9,
          minute: 0,
        },
      });
    }

    return 'granted';
  } catch {
    return 'skipped';
  }
}
