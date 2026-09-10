import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Row } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { languages, t } from '@/i18n';
import { achievementsFromActivity, achievementLabelKey } from '@/services/achievements';
import { getTier } from '@/lib/entitlements';
import { studyData } from '@/services/study-data';

export default function Profile() {
  const { session, signOut, setLanguage, streak, tasks, goals, aiHistory } = useApp();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [focusStats, setFocusStats] = useState({ count: 0, totalSeconds: 0 });
  const tr = (key: string) => t(session!.language, key);
  const tier = getTier(session);
  const achievements = useMemo(
    () =>
      achievementsFromActivity({
        sessionCount: focusStats.count,
        focusSeconds: focusStats.totalSeconds,
        tasks,
        goals,
        currentStreak: streak.current,
      }).filter((item) => item.earned),
    [tasks, goals, streak, focusStats],
  );

  const invite = async () => {
    try {
      await Share.share({ message: tr('inviteMessage'), title: tr('inviteTitle') });
    } catch {
      Alert.alert(tr('inviteFriends'), tr('noReferralRewards'));
    }
  };

  useEffect(() => {
    if (!session) {
      return;
    }
    void studyData.focusStats(session.id).then(setFocusStats).catch(() => undefined);
  }, [session, streak]);

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>{tr('profile')}</Text>
        <Card style={s.person}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>🎓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{session!.name}</Text>
            <Text style={s.muted}>{session!.email || session!.phone}</Text>
            <Text style={s.muted}>
              {tr('subscription')}: {tr(tier === 'free' ? 'noPlan' : tier)}
            </Text>
          </View>
        </Card>
        <View style={s.streak}>
          <Text style={s.streakText}>
            {tr('streak')} · {streak.current} {tr('days')} 🔥
          </Text>
        </View>
        <Card>
          <Row icon="sparkles-outline" label={tr('aiMeter')} onPress={() => router.push('/ai-meter')} />
          <Row icon="chatbubble-ellipses-outline" label={tr('leo')} onPress={() => router.push('/leo')} />
          <Row icon="calendar-outline" label={tr('studySchedule')} onPress={() => router.push('/schedule-maker')} />
          <Row icon="locate-outline" label={tr('goals')} onPress={() => router.push('/goals')} />
          <Row
            icon="trophy-outline"
            label={tr('achievements')}
            value={String(achievements.length)}
            onPress={() =>
              Alert.alert(
                tr('achievements'),
                achievements.length
                  ? achievements.map((item) => tr(achievementLabelKey(item.id))).join('\n')
                  : tr('noAchievementsYet'),
              )
            }
          />
          <Row icon="bar-chart-outline" label={tr('statistics')} onPress={() => router.push('/(tabs)/progress')} />
          <Row icon="card-outline" label={tr('subscription')} onPress={() => router.push('/subscription')} />
          <Row
            icon="language-outline"
            label={tr('language')}
            value={languages.find((item) => item[0] === session!.language)?.[1]}
            onPress={() => setLanguageModalVisible(true)}
          />
          <Row icon="settings-outline" label={tr('settings')} onPress={() => router.push('/settings')} />
          <Row icon="people-outline" label={tr('inviteFriends')} onPress={invite} />
          <Row icon="document-text-outline" label={tr('privacyPolicy')} onPress={() => router.push('/legal')} />
          {session!.role === 'admin' && (
            <Row icon="shield-checkmark-outline" label={tr('admin')} onPress={() => router.push('/admin')} />
          )}
          <Row
            icon="log-out-outline"
            label={tr('signOut')}
            onPress={async () => {
              await signOut();
              router.replace('/');
            }}
          />
        </Card>
        <Text style={s.note}>{aiHistory.length} · {tr('yourAiActivity')}</Text>
      </ScrollView>
      <Modal visible={languageModalVisible} transparent animationType="slide" onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLanguageModalVisible(false)} />
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{tr('language')}</Text>
            <Text style={s.modalSubtitle}>{tr('chooseLanguage')}</Text>
            <ScrollView style={s.languageList}>
              {languages.map(([code, name]) => {
                const selected = code === session!.language;
                return (
                  <Pressable
                    key={code}
                    style={[s.languageOption, selected && s.languageOptionSelected]}
                    onPress={() => {
                      setLanguage(code);
                      setLanguageModalVisible(false);
                    }}
                  >
                    <Text style={[s.languageName, selected && s.languageNameSelected]}>{name}</Text>
                    {selected ? <Text style={s.checkmark}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: 'white' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: colors.ink, marginBottom: 18 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lilac,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 34 },
  name: { fontSize: 19, fontWeight: '900', color: colors.ink },
  muted: { color: colors.muted, fontSize: 13, marginTop: 4 },
  streak: { backgroundColor: colors.purple, borderRadius: 16, padding: 18, marginBottom: 14 },
  streakText: { color: 'white', fontWeight: '800' },
  note: { color: colors.muted, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  modalTitle: { fontSize: 22, fontWeight: '900', color: colors.ink },
  modalSubtitle: { color: colors.muted, fontSize: 14, marginBottom: 14, marginTop: 4 },
  languageList: { maxHeight: 500 },
  languageOption: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F7FA',
  },
  languageOptionSelected: { backgroundColor: colors.lilac },
  languageName: { fontSize: 16, fontWeight: '600', color: colors.ink },
  languageNameSelected: { fontWeight: '800' },
  checkmark: { fontSize: 20, fontWeight: '900', color: colors.purple },
});
