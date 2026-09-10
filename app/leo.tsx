import { useState } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { generateAi } from '@/services/ai';
import { getTier, hasBasicAi } from '@/lib/entitlements';
import { endOfWeek, startOfWeek } from '@/lib/dates';
import { studyData } from '@/services/study-data';

type Message = { role: 'leo' | 'user'; text: string };

export default function Leo() {
  const { session, settings, tasks, goals } = useApp();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'leo', text: t(session!.language, 'leoGreeting') },
  ]);
  const tr = (key: string) => t(session!.language, key);
  const tier = getTier(session);

  const send = async () => {
    if (!hasBasicAi(tier)) {
      router.push('/subscription');
      return;
    }
    const clean = input.trim();
    if (!clean) {
      return;
    }
    setInput('');
    setMessages((list) => [...list, { role: 'user', text: clean }]);
    setBusy(true);
    try {
      let focusMinutesThisWeek = 0;
      if (settings.aiContextEnabled && session) {
        const week = await studyData.focusSessions(session.id, startOfWeek(new Date()), endOfWeek(new Date()));
        focusMinutesThisWeek = Math.round(
          week.reduce((sum, item) => sum + item.duration_seconds, 0) / 60,
        );
      }
      const response = await generateAi({
        kind: 'leo',
        prompt: clean,
        context: settings.aiContextEnabled
          ? {
              tasks: tasks.slice(0, 20).map((task) => ({
                title: task.title,
                scheduledAt: task.scheduledAt,
                done: task.done,
              })),
              goals: goals.slice(0, 10).map((goal) => ({
                title: goal.title,
                currentValue: goal.currentValue,
                targetValue: goal.targetValue,
                dueAt: goal.dueAt,
              })),
              focusMinutesThisWeek,
            }
          : undefined,
      });
      setMessages((list) => [...list, { role: 'leo', text: response.text || tr('aiError') }]);
    } catch (error) {
      Alert.alert(tr('leo'), error instanceof Error ? error.message : tr('aiError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={s.back}>{tr('back')}</Text>
          </Pressable>
          <Text style={s.title}>{tr('leo')}</Text>
        </View>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.hint}>{tr('leoEmpty')}</Text>
          {messages.length === 0 ? <EmptyState title={tr('leoEmpty')} /> : null}
          {messages.map((message, index) => (
            <View key={`${message.role}-${index}`} style={[s.bubble, message.role === 'user' && s.user]}>
              <Text style={[s.body, message.role === 'user' && s.userText]}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={s.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={tr('leoPlaceholder')}
            placeholderTextColor={colors.muted}
            style={s.input}
          />
          <Button label={busy ? tr('generating') : tr('send')} onPress={send} loading={busy} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  back: { color: colors.purple, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink, marginTop: 8 },
  scroll: { padding: 20, paddingBottom: 20 },
  hint: { color: colors.muted, marginBottom: 12, lineHeight: 20 },
  bubble: {
    backgroundColor: colors.soft,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  user: { backgroundColor: colors.purple, alignSelf: 'flex-end' },
  body: { color: colors.ink, lineHeight: 20 },
  userText: { color: 'white' },
  composer: { padding: 16, gap: 10, borderTopWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.soft, borderRadius: 14, padding: 14, color: colors.ink },
});
