import { router } from 'expo-router';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BRAND } from '@/constants/brand';
import { userFacingError } from '@/lib/errors';
import { isTesterBuildEnabled, isTesterSession } from '@/lib/tester';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { notificationService } from '@/services/settings';
import { inviteFriends } from '@/services/sharing';

export default function Settings() {
  const { session, signOut, deleteAccount } = useAuth();
  const { settings, saveSettings, resetTesterData } = useStudy();
  const { preference, setPreference, colors } = useTheme();

  const toggle = async (key: 'notificationsEnabled' | 'studyReminders' | 'taskReminders' | 'goalReminders', value: boolean) => {
    if (value && key === 'notificationsEnabled') {
      const permission = await notificationService.requestPermission();
      if (!permission.granted) {
        Alert.alert('Notifications', permission.message);
        return;
      }
    }
    await saveSettings({ [key]: value });
  };

  return (
    <Screen>
      <ScreenHeader title="Settings" back />
      <Text style={[styles.section, { color: colors.secondaryText }]}>Theme</Text>
      <Card padded={false}>
        <View style={{ paddingHorizontal: 16 }}>
          {(['system', 'light', 'dark'] as const).map((item) => (
            <ListRow
              key={item}
              icon={item === 'dark' ? 'moon-outline' : item === 'light' ? 'sunny-outline' : 'phone-portrait-outline'}
              label={item[0]?.toUpperCase() + item.slice(1)}
              value={preference === item ? 'Selected' : undefined}
              onPress={() => setPreference(item)}
            />
          ))}
        </View>
      </Card>

      <Text style={[styles.section, { color: colors.secondaryText }]}>Notifications / reminders</Text>
      <Card padded={false}>
        <View style={{ paddingHorizontal: 16 }}>
          <ListRow
            icon="notifications-outline"
            label="Notifications"
            value={settings?.notificationsEnabled ? 'On' : 'Off'}
            onPress={() => void toggle('notificationsEnabled', !settings?.notificationsEnabled)}
          />
          <ListRow
            icon="alarm-outline"
            label="Study reminders"
            value={settings?.studyReminders ? 'On' : 'Off'}
            onPress={() => void toggle('studyReminders', !settings?.studyReminders)}
          />
          <ListRow
            icon="checkbox-outline"
            label="Task reminders"
            value={settings?.taskReminders ? 'On' : 'Off'}
            onPress={() => void toggle('taskReminders', !settings?.taskReminders)}
          />
          <ListRow
            icon="flag-outline"
            label="Goal reminders"
            value={settings?.goalReminders ? 'On' : 'Off'}
            onPress={() => void toggle('goalReminders', !settings?.goalReminders)}
          />
        </View>
      </Card>

      <Text style={[styles.section, { color: colors.secondaryText }]}>Account</Text>
      <Card padded={false}>
        <View style={{ paddingHorizontal: 16 }}>
          {isTesterBuildEnabled() && isTesterSession(session) ? (
            <ListRow
              icon="refresh-outline"
              label="Reset tester sample data"
              onPress={() =>
                Alert.alert(
                  'Reset tester data',
                  'Replace this tester profile’s tasks, goals, focus history, achievements, and AI Meter samples with the original set?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      onPress: async () => {
                        try {
                          await resetTesterData();
                          Alert.alert('Tester data', 'Sample study data was restored.');
                        } catch (error) {
                          Alert.alert(
                            'Tester data',
                            userFacingError(error, 'Unable to reset tester data right now.'),
                          );
                        }
                      },
                    },
                  ],
                )
              }
            />
          ) : null}
          <ListRow icon="card-outline" label="Subscription" onPress={() => router.push('/subscription')} />
          <ListRow icon="people-outline" label="Invite friends" onPress={() => void inviteFriends()} />
          <ListRow icon="lock-closed-outline" label="Privacy" onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })} />
          <ListRow icon="document-text-outline" label="Terms" onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })} />
          <ListRow icon="help-circle-outline" label="Support" onPress={() => Linking.openURL(`mailto:${BRAND.supportEmail}`)} />
          <ListRow
            icon="log-out-outline"
            label="Sign out"
            onPress={() =>
              Alert.alert('Sign out', 'Sign out of Study Flow?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/'); } },
              ])
            }
          />
          <ListRow
            icon="trash-outline"
            label="Delete account"
            danger
            onPress={() =>
              Alert.alert(
                'Delete account',
                'This permanently deletes your Study Flow data and sign-in. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete my account',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteAccount();
                        router.replace('/');
                      } catch (error) {
                        Alert.alert('Delete account', userFacingError(error, 'Unable to delete the account right now.'));
                      }
                    },
                  },
                ],
              )
            }
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontWeight: '800', marginBottom: 8, marginTop: 8 },
});
