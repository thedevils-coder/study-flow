import { useState } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Row } from '@/components/ui';
import { BRAND, colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { UserSettings } from '@/types';

export default function Settings() {
  const { session, settings, saveSettings, signOut, deleteAccount } = useApp();
  const tr = (key: string) => t(session!.language, key);
  const [busy, setBusy] = useState(false);

  const update = async (patch: Partial<UserSettings>) => {
    try {
      await saveSettings(patch);
      if (
        patch.notificationsEnabled === true ||
        patch.studyReminders !== undefined ||
        patch.goalReminders !== undefined
      ) {
        const { syncLocalReminders } = await import('@/services/notifications');
        const result = await syncLocalReminders({ ...settings, ...patch });
        if (result === 'denied') {
          Alert.alert(tr('notifications'), tr('notificationsPermissionDenied'));
        }
      }
    } catch {
      Alert.alert(tr('settings'), tr('unableToSaveSettings'));
    }
  };

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={s.back}>{tr('back')}</Text>
        </Pressable>
        <Text style={s.title}>{tr('settings')}</Text>

        <Card>
          <Text style={s.heading}>{tr('appearance')}</Text>
          {(['light', 'dark', 'system'] as UserSettings['theme'][]).map((theme) => (
            <Row
              key={theme}
              icon={theme === 'dark' ? 'moon-outline' : 'sunny-outline'}
              label={tr(theme)}
              value={settings.theme === theme ? '✓' : undefined}
              onPress={() => update({ theme })}
            />
          ))}
        </Card>

        <Card>
          <Text style={s.heading}>{tr('notifications')}</Text>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>{tr('notificationsEnabled')}</Text>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(notificationsEnabled) => update({ notificationsEnabled })}
            />
          </View>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>{tr('studyReminders')}</Text>
            <Switch
              value={settings.studyReminders}
              onValueChange={(studyReminders) => update({ studyReminders })}
            />
          </View>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>{tr('goalReminders')}</Text>
            <Switch
              value={settings.goalReminders}
              onValueChange={(goalReminders) => update({ goalReminders })}
            />
          </View>
        </Card>

        <Card>
          <Text style={s.heading}>{tr('focusPreferences')}</Text>
          {[15, 25, 45, 50].map((minutes) => (
            <Row
              key={minutes}
              icon="timer-outline"
              label={`${minutes} ${tr('minutes')}`}
              value={settings.focusMinutes === minutes ? '✓' : undefined}
              onPress={() => update({ focusMinutes: minutes })}
            />
          ))}
        </Card>

        <Card>
          <Text style={s.heading}>{tr('aiPreferences')}</Text>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>{tr('aiContextEnabled')}</Text>
            <Switch
              value={settings.aiContextEnabled}
              onValueChange={(aiContextEnabled) => update({ aiContextEnabled })}
            />
          </View>
        </Card>

        <Card>
          <Text style={s.heading}>{tr('account')}</Text>
          <Row icon="card-outline" label={tr('subscription')} onPress={() => router.push('/subscription')} />
          <Row icon="language-outline" label={tr('language')} onPress={() => router.push('/(tabs)/profile')} />
          <Row
            icon="mail-outline"
            label={tr('support')}
            onPress={() => Linking.openURL(`mailto:${BRAND.supportEmail}`)}
          />
          <Row icon="document-text-outline" label={tr('legal')} onPress={() => router.push('/legal')} />
        </Card>

        <Card>
          <Text style={s.heading}>{tr('dataManagement')}</Text>
          <Button
            label={tr('signOut')}
            variant="light"
            onPress={async () => {
              await signOut();
              router.replace('/');
            }}
          />
          <View style={{ height: 10 }} />
          <Button
            label={tr('deleteAccount')}
            variant="danger"
            loading={busy}
            onPress={() =>
              Alert.alert(tr('deleteAccount'), tr('deleteAccountConfirm'), [
                { text: tr('cancel'), style: 'cancel' },
                {
                  text: tr('deleteAccount'),
                  style: 'destructive',
                  onPress: async () => {
                    setBusy(true);
                    try {
                      await deleteAccount();
                      router.replace('/');
                    } catch {
                      Alert.alert(tr('deleteAccount'), tr('deleteAccountFailed'));
                    } finally {
                      setBusy(false);
                    }
                  },
                },
              ])
            }
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: 20, paddingBottom: 48 },
  back: { color: colors.purple, fontWeight: '800', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink, marginVertical: 12 },
  heading: { fontWeight: '900', fontSize: 16, color: colors.ink, marginBottom: 4 },
  switchRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  switchLabel: { flex: 1, fontWeight: '600', color: colors.ink, paddingRight: 12 },
});
