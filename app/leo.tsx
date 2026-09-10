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
import { Button, EmptyState, ThemedSafeArea } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { useColors } from '@/lib/use-colors';
import { aiErrorCopyKey, generateAi } from '@/services/ai';
import { getTier, canUseKind } from '@/lib/entitlements';
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
  const palette = useColors();
  const tier = getTier(session);

  const send = async () => {
    if (!canUseKind(tier, 'leo')) {
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
      Alert.alert(tr('leo'), tr(aiErrorCopyKey(error)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={[s.back, { color: palette.purple }]}>{tr('back')}</Text>
          </Pressable>
          <Text style={[s.title, { color: palette.ink }]}>{tr('leo')}</Text>
        </View>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={[s.hint, { color: palette.muted }]}>{tr('leoEmpty')}</Text>
          <View style={s.suggestions}>
            {(['leoSuggestPlan', 'leoSuggestFocus', 'leoSuggestGoals'] as const).map((key) => (
              <Pressable
                key={key}
                style={[s.chip, { backgroundColor: palette.lilac }]}
                onPress={() => {
                  setInput(tr(key));
                }}
              >
                <Text style={[s.chipText, { color: palette.purple }]}>{tr(key)}</Text>
              </Pressable>
            ))}
          </View>
          {messages.length === 0 ? <EmptyState title={tr('leoEmpty')} /> : null}
          {messages.map((message, index) => (
            <View
              key={`${message.role}-${index}`}
              style={[s.bubble, { backgroundColor: palette.soft }, message.role === 'user' && s.user]}
            >
              <Text style={[s.body, { color: palette.ink }, message.role === 'user' && s.userText]}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={[s.composer, { borderColor: palette.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={tr('leoPlaceholder')}
            placeholderTextColor={palette.muted}
            style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
          />
          <Button label={busy ? tr('generating') : tr('send')} onPress={send} loading={busy} />
        </View>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8 },
  back: { fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '900', marginTop: 8 },
  scroll: { padding: 20, paddingBottom: 20 },
  hint: { marginBottom: 12, lineHeight: 20 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  chipText: { fontWeight: '700', fontSize: 12 },
  bubble: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  user: { backgroundColor: '#5932E8', alignSelf: 'flex-end' },
  body: { lineHeight: 20 },
  userText: { color: 'white' },
  composer: { padding: 16, gap: 10, borderTopWidth: 1 },
  input: { borderRadius: 14, padding: 14 },
});
