import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { TestStateNotice } from '@/components/TestStateNotice';
import { displayPlanLabel } from '@/lib/entitlements';
import { TESTER_COPY, isTesterBuildEnabled, isTesterSession } from '@/lib/tester';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { inviteFriends } from '@/services/sharing';

type ConfirmAction = 'signout' | 'delete' | null;

export default function Profile() {
  const { session, signOut, deleteAccount, tier } = useAuth();
  const { progress } = useStudy();
  const { colors } = useTheme();

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction>(null);

  const [loading, setLoading] = useState(false);

  const closeDialog = () => {
    if (!loading) {
      setConfirmAction(null);
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction || loading) return;

    setLoading(true);

    try {
      console.log('[Profile] confirm action:', confirmAction);

      if (confirmAction === 'signout') {
        console.log('[Profile] signing out...');

        await signOut();

        console.log('[Profile] sign out complete');

        setConfirmAction(null);
        router.replace('/');
        return;
      }

      if (confirmAction === 'delete') {
        console.log('[Profile] deleting account...');

        await deleteAccount();

        console.log('[Profile] delete account complete');

        setConfirmAction(null);
        router.replace('/');
        return;
      }
    } catch (error) {
      console.error('[Profile] account action failed:', error);
      setLoading(false);
      setConfirmAction(null);
      return;
    }

    setLoading(false);
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>
        Profile
      </Text>

      {isTesterBuildEnabled() && isTesterSession(session) ? (
        <TestStateNotice
          title="Tester / Demo account"
          message={TESTER_COPY.home}
        />
      ) : null}

      <Card style={styles.person}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.accentSoft },
          ]}
        >
          <Text style={{ fontSize: 28 }}>🎓</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>
            {session?.name}
          </Text>

          <Text style={{ color: colors.secondaryText }}>
            {session?.email}
          </Text>
        </View>
      </Card>

      <View
        style={[
          styles.streak,
          { backgroundColor: colors.accent },
        ]}
      >
        <Text style={styles.streakText}>
          Current streak · {progress.currentStreak}{' '}
          {progress.currentStreak === 1 ? 'day' : 'days'}
        </Text>
      </View>

      <Card padded={false}>
        <View style={{ paddingHorizontal: 16 }}>
          <ListRow
            icon="locate-outline"
            label="Goals"
            onPress={() => router.push('/goals')}
          />

          <ListRow
            icon="trophy-outline"
            label="Achievements"
            onPress={() => router.push('/achievements')}
          />

          <ListRow
            icon="bar-chart-outline"
            label="Progress"
            onPress={() => router.push('/(tabs)/progress')}
          />

          <ListRow
            icon="sparkles-outline"
            label="AI Meter"
            onPress={() => router.push('/ai-meter')}
          />

          <ListRow
            icon="chatbubble-ellipses-outline"
            label="Leo"
            onPress={() => router.push('/leo')}
          />

          <ListRow
            icon="card-outline"
            label="Subscription"
            value={displayPlanLabel(tier)}
            onPress={() => router.push('/subscription')}
          />

          <ListRow
            icon="people-outline"
            label="Invite friends"
            onPress={() => void inviteFriends()}
          />

          <ListRow
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push('/settings')}
          />

          {session?.role === 'admin' ? (
            <ListRow
              icon="shield-checkmark-outline"
              label="Admin"
              onPress={() => router.push('/admin')}
            />
          ) : null}

          <ListRow
            icon="log-out-outline"
            label="Sign out"
            danger
            onPress={() => {
              console.log('[Profile] Sign out pressed');
              setConfirmAction('signout');
            }}
          />

          <ListRow
            icon="trash-outline"
            label="Delete account"
            danger
            onPress={() => {
              console.log('[Profile] Delete account pressed');
              setConfirmAction('delete');
            }}
          />
        </View>
      </Card>

      <ConfirmDialog
        visible={confirmAction !== null}
        title={
          confirmAction === 'delete'
            ? 'Delete account'
            : 'Sign out'
        }
        message={
          confirmAction === 'delete'
            ? 'This permanently deletes your Study Flow data and sign-in. This cannot be undone.'
            : 'Are you sure you want to sign out of Study Flow?'
        }
        confirmLabel={
          loading
            ? confirmAction === 'delete'
              ? 'Deleting...'
              : 'Signing out...'
            : confirmAction === 'delete'
              ? 'Delete account'
              : 'Sign out'
        }
        cancelLabel="Cancel"
        destructive={confirmAction === 'delete'}
        loading={loading}
        onCancel={closeDialog}
        onConfirm={() => void handleConfirm()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 16,
  },

  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  name: {
    fontSize: 19,
    fontWeight: '900',
  },

  streak: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },

  streakText: {
    color: 'white',
    fontWeight: '800',
  },
});