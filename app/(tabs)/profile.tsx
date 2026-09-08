import { useState } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Row } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { languages, t } from '@/i18n';

export default function Profile() {
  const { session, signOut, setLanguage } = useApp();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const tr = (key: string) => t(session!.language, key);

  const changeLanguage = () => {
    setLanguageModalVisible(true);
  };

  const selectLanguage = (code: (typeof languages)[number][0]) => {
    setLanguage(code);
    setLanguageModalVisible(false);
  };

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>{tr('profile')}</Text>

        <Card style={s.person}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>🎓</Text>
          </View>

          <View>
            <Text style={s.name}>{session!.name}</Text>
            <Text style={s.muted}>{session!.email}</Text>
          </View>
        </Card>

        <View style={s.streak}>
          <Text style={s.streakText}>
            {tr('streak')} · 7 {tr('days')} 🔥
          </Text>
        </View>

        <Card>
          <Row
            icon="locate-outline"
            label={tr('goals')}
            onPress={() => router.push({ pathname: '/goals' } as any)}
         />

          <Row
            icon="trophy-outline"
            label={tr('achievements')}
            onPress={() =>
              Alert.alert(
                tr('achievements'),
                '7-Day Streak · Focus Master · Early Bird',
              )
            }
          />

          <Row
            icon="bar-chart-outline"
            label={tr('statistics')}
            onPress={() => router.push('/(tabs)/progress')}
          />

          <Row
            icon="card-outline"
            label={tr('subscription')}
            onPress={() => router.push('/subscription')}
          />

          <Row
            icon="language-outline"
            label={tr('language')}
            value={
              languages.find(
                (item) => item[0] === session!.language,
              )?.[1]
            }
            onPress={changeLanguage}
          />

          <Row
            icon="settings-outline"
            label={tr('settings')}
            onPress={() =>
              Alert.alert(
                tr('settings'),
                'Theme, focus mode and reminder controls are ready for backend preference sync.',
              )
            }
          />

          {session!.role === 'admin' && (
            <Row
              icon="shield-checkmark-outline"
              label={tr('admin')}
              onPress={() => router.push('/admin')}
            />
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
      </ScrollView>

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setLanguageModalVisible(false)}
          />

          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{tr('language')}</Text>

              <Pressable
                onPress={() => setLanguageModalVisible(false)}
                hitSlop={10}
              >
                <Text style={s.closeButton}>✕</Text>
              </Pressable>
            </View>

            <Text style={s.modalSubtitle}>
              Choose your language
            </Text>

            <ScrollView
              style={s.languageList}
              contentContainerStyle={s.languageListContent}
              showsVerticalScrollIndicator
            >
              {languages.map(([code, name]) => {
                const selected = code === session!.language;

                return (
                  <Pressable
                    key={code}
                    style={[
                      s.languageOption,
                      selected && s.languageOptionSelected,
                    ]}
                    onPress={() => selectLanguage(code)}
                  >
                    <Text
                      style={[
                        s.languageName,
                        selected && s.languageNameSelected,
                      ]}
                    >
                      {name}
                    </Text>

                    {selected && (
                      <Text style={s.checkmark}>✓</Text>
                    )}
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
  page: {
    flex: 1,
    backgroundColor: 'white',
  },

  scroll: {
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 18,
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
    backgroundColor: colors.lilac,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 34,
  },

  name: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.ink,
  },

  muted: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },

  streak: {
    backgroundColor: colors.purple,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },

  streakText: {
    color: 'white',
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.ink,
  },

  closeButton: {
    fontSize: 22,
    color: colors.muted,
  },

  modalSubtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 14,
  },

  languageList: {
    maxHeight: 500,
  },

  languageListContent: {
    paddingBottom: 8,
  },

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

  languageOptionSelected: {
    backgroundColor: colors.lilac,
  },

  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },

  languageNameSelected: {
    fontWeight: '800',
  },

  checkmark: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.purple,
  },
});