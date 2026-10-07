import { router } from 'expo-router';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BRAND } from '@/constants/brand';
import { alertDialog, confirmDialog } from '@/lib/dialog';
import { userFacingError } from '@/lib/errors';
import { isTesterBuildEnabled, isTesterSession } from '@/lib/tester';
import { webDebug } from '@/lib/web-debug';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { inviteFriends } from '@/services/sharing';

export default function Settings() {
  const { session, signOut, deleteAccount } = useAuth();
  const { resetTesterData } = useStudy();
  const { preference, setPreference, colors } = useTheme();

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
            onPress={() => {
              webDebug('Sign Out pressed');
              void (async () => {
                const confirmed = await confirmDialog({
                  title: 'Sign out',
                  message: 'Sign out of Study Flow?',
                  confirmLabel: 'Sign out',
                  destructive: true,
                });
                if (!confirmed) return;
                await signOut();
                router.replace('/');
              })();
            }}
          />
          <ListRow
            icon="trash-outline"
            label="Delete account"
            danger
            onPress={() => {
              webDebug('Delete Account pressed');
              void (async () => {
                const confirmed = await confirmDialog({
                  title: 'Delete account',
                  message: 'This permanently deletes your Study Flow data and sign-in. This cannot be undone.',
                  confirmLabel: 'Delete my account',
                  destructive: true,
                });
                if (!confirmed) return;
                try {
                  await deleteAccount();
                  router.replace('/');
                } catch (error) {
                  await alertDialog('Delete account', userFacingError(error, 'Unable to delete the account right now.'));
                }
              })();
            }}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontWeight: '800', marginBottom: 8, marginTop: 8 },
});
