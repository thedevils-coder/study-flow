import { router } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
import { useState } from 'react';

export default function Settings() {
  const { session, signOut, deleteAccount } = useAuth();
  const { settings, saveSettings, resetTesterData } = useStudy();
  const { preference, setPreference, colors } = useTheme();

  const [dialog, setDialog] = useState<'signout' | 'delete' | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async (
    key:
      | 'notificationsEnabled'
      | 'studyReminders'
      | 'taskReminders'
      | 'goalReminders',
    value: boolean,
  ) => {
    if (value && key === 'notificationsEnabled') {
      const permission = await notificationService.requestPermission();

      if (!permission.granted) {
        alert(permission.message);
        return;
      }
    }

    await saveSettings({ [key]: value });
  };

  const closeDialog = () => {
    if (!loading) {
      setDialog(null);
    }
  };

  const handleSignOut = async () => {
    if (loading) return;

    setLoading(true);

    try {
      await signOut();
      setDialog(null);
      router.replace('/');
    } catch (error) {
      setDialog(null);
      alert(userFacingError(error, 'Unable to sign out right now.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (loading) return;

    setLoading(true);

    try {
      await deleteAccount();
      setDialog(null);
      router.replace('/');
    } catch (error) {
      setDialog(null);
      alert(
        userFacingError(
          error,
          'Unable to delete the account right now.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Settings" back />

      <Text style={[styles.section, { color: colors.secondaryText }]}>
        Theme
      </Text>

      <Card padded={false}>
        <View style={{ paddingHorizontal: 16 }}>
          {(['system', 'light', 'dark'] as const).map((item) => (
            <ListRow
              key={item}
              icon={
                item === 'dark'
                  ? 'moon-outline'
                  : item === 'light'
                    ? 'sunny-outline'
                    : 'phone-portrait-outline'
              }
              label={item[0]?.toUpperCase() + item.slice(1)}
              value={preference === item ? 'Selected' : undefined}
              onPress={() => setPreference(item)}
            />
          ))}
        </View>
      </Card>

      <Text style={[styles.section, { color: colors.secondaryText }]}>
        Notifications / reminders
      </Text>

      <Card padded={false}>
        <View style={{ paddingHorizontal: 16 }}>
          <ListRow
            icon="notifications-outline"
            label="Notifications"
            value={settings?.notificationsEnabled ? 'On' : 'Off'}
            onPress={() =>
              void toggle(
                'notificationsEnabled',
                !settings?.notificationsEnabled,
              )
            }
          />

          <ListRow
            icon="alarm-outline"
            label="Study reminders"
            value={settings?.studyReminders ? 'On' : 'Off'}
            onPress={() =>
              void toggle(
                'studyReminders',
                !settings?.studyReminders,
              )
            }
          />

          <ListRow
            icon="checkbox-outline"
            label="Task reminders"
            value={settings?.taskReminders ? 'On' : 'Off'}
            onPress={() =>
              void toggle(
                'taskReminders',
                !settings?.taskReminders,
              )
            }
          />

          <ListRow
            icon="flag-outline"
            label="Goal reminders"
            value={settings?.goalReminders ? 'On' : 'Off'}
            onPress={() =>
              void toggle(
                'goalReminders',
                !settings?.goalReminders,
              )
            }
          />
        </View>
      </Card>

      <Text style={[styles.section, { color: colors.secondaryText }]}>
        Account
      </Text>

      <Card padded={false}>
        <View style={{ paddingHorizontal: 16 }}>
          {isTesterBuildEnabled() && isTesterSession(session) ? (
            <ListRow
              icon="refresh-outline"
              label="Reset tester sample data"
              onPress={async () => {
                try {
                  await resetTesterData();
                  alert('Sample study data was restored.');
                } catch (error) {
                  alert(
                    userFacingError(
                      error,
                      'Unable to reset tester data right now.',
                    ),
                  );
                }
              }}
            />
          ) : null}

          <ListRow
            icon="card-outline"
            label="Subscription"
            onPress={() => router.push('/subscription')}
          />

          <ListRow
            icon="people-outline"
            label="Invite friends"
            onPress={() => void inviteFriends()}
          />

          <ListRow
            icon="lock-closed-outline"
            label="Privacy"
            onPress={() =>
              router.push({
                pathname: '/legal',
                params: { doc: 'privacy' },
              })
            }
          />

          <ListRow
            icon="document-text-outline"
            label="Terms"
            onPress={() =>
              router.push({
                pathname: '/legal',
                params: { doc: 'terms' },
              })
            }
          />

          <ListRow
            icon="help-circle-outline"
            label="Support"
            onPress={() =>
              void Linking.openURL(`mailto:${BRAND.supportEmail}`)
            }
          />

          <ListRow
            icon="log-out-outline"
            label={loading && dialog === 'signout' ? 'Signing out...' : 'Sign out'}
            onPress={() => {
              if (!loading) {
                setDialog('signout');
              }
            }}
          />

          <ListRow
            icon="trash-outline"
            label={
              loading && dialog === 'delete'
                ? 'Deleting account...'
                : 'Delete account'
            }
            danger
            onPress={() => {
              if (!loading) {
                setDialog('delete');
              }
            }}
          />
        </View>
      </Card>

      <ConfirmDialog
        visible={dialog === 'signout'}
        title="Sign out"
        message="Are you sure you want to sign out of Study Flow?"
        confirmLabel={loading ? 'Signing out...' : 'Sign out'}
        loading={loading}
        onCancel={closeDialog}
        onConfirm={() => {
          void handleSignOut();
        }}
      />

      <ConfirmDialog
        visible={dialog === 'delete'}
        title="Delete account"
        message="This permanently deletes your Study Flow data and sign-in. This cannot be undone."
        confirmLabel={loading ? 'Deleting...' : 'Delete my account'}
        loading={loading}
        onCancel={closeDialog}
        onConfirm={() => {
          void handleDeleteAccount();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 8,
  },
});