import { useState } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, EmptyState } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { generateAi } from '@/services/ai';
import { AiKind } from '@/types';
import { canDownloadAi, canUseKind, getTier, hasBasicAi, hasProAi } from '@/lib/entitlements';

const examples: { key: string; kind: AiKind; prompt: string }[] = [
  { key: 'exampleQuantum', kind: 'explain', prompt: 'Explain quantum physics for a high-school student.' },
  { key: 'exampleCell', kind: 'notes', prompt: 'Create notes on cell division.' },
  { key: 'exampleAlchemist', kind: 'summary', prompt: 'Summary of The Alchemist.' },
  { key: 'exampleQuiz', kind: 'quiz', prompt: 'Create a quiz on photosynthesis.' },
];

export default function AiMeter() {
  const { session, settings, tasks, goals, aiHistory, refreshAiHistory } = useApp();
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<AiKind>('notes');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const tr = (key: string) => t(session!.language, key);
  const tier = getTier(session);
  const kinds: AiKind[] = ['notes', 'summary', 'flashcards', 'quiz', 'explain'];

  const run = async (nextKind: AiKind, nextPrompt: string) => {
    if (!hasBasicAi(tier)) {
      router.push('/subscription');
      return;
    }
    if (!canUseKind(tier, nextKind)) {
      Alert.alert(tr('aiMeter'), tr('proFeature'));
      return;
    }
    const clean = nextPrompt.trim();
    if (!clean) {
      Alert.alert(tr('aiMeter'), tr('requiredField'));
      return;
    }
    setBusy(true);
    try {
      const response = await generateAi({
        kind: nextKind,
        prompt: clean,
        context: settings.aiContextEnabled
          ? {
              tasks: tasks.slice(0, 15).map((task) => ({
                title: task.title,
                scheduledAt: task.scheduledAt,
                done: task.done,
              })),
              goals: goals.slice(0, 8).map((goal) => ({
                title: goal.title,
                currentValue: goal.currentValue,
                targetValue: goal.targetValue,
                dueAt: goal.dueAt,
              })),
            }
          : undefined,
      });
      setResult(response.text);
      await refreshAiHistory();
    } catch (error) {
      Alert.alert(tr('aiMeter'), error instanceof Error ? error.message : tr('aiError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.iconBtn} accessibilityLabel={tr('back')}>
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <Text style={s.title}>{tr('aiMeter')}</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>{tr('newBadge')}</Text>
          </View>
          <Pressable
            onPress={() => Alert.alert(tr('aiInfoTitle'), tr('aiInfoBody'))}
            style={s.iconBtn}
            accessibilityLabel={tr('info')}
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <View style={s.hero}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>{tr('aiHero')}</Text>
            <Text style={s.heroBody}>{tr('aiHeroDescription')}</Text>
          </View>
          <Image source={require('../assets/images/leo-robot.png')} style={s.robot} />
        </View>

        <View style={s.create}>
          <Text style={s.createTitle}>{tr('whatToCreate')}</Text>
          <View style={s.inputRow}>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder={tr('promptPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.7)"
              style={s.input}
            />
            <Pressable
              onPress={() => run(kind, prompt)}
              style={s.send}
              accessibilityLabel={tr('generate')}
            >
              <Ionicons name="sparkles" size={18} color={colors.purple} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.kinds}>
            {kinds.map((item) => (
              <Pressable
                key={item}
                onPress={() => setKind(item)}
                style={[s.kind, kind === item && s.kindOn]}
              >
                <Text style={s.kindText}>{tr(item)}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => router.push('/leo')} style={s.kind}>
              <Text style={s.kindText}>{tr('more')}</Text>
            </Pressable>
          </ScrollView>
        </View>

        <View style={s.sectionHead}>
          <Text style={s.section}>{tr('tryThese')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.examples}>
          {examples.map((item) => (
            <Pressable
              key={item.key}
              style={s.example}
              onPress={() => {
                setKind(item.kind);
                setPrompt(item.prompt);
                void run(item.kind, item.prompt);
              }}
            >
              <Text style={s.exampleText}>{tr(item.key)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {result ? (
          <Card>
            <Text style={s.section}>{tr(kind)}</Text>
            <Text style={s.result}>{result}</Text>
            {canDownloadAi(tier) ? (
              <Button
                label={tr('download')}
                variant="light"
                onPress={() => Share.share({ message: result })}
              />
            ) : null}
          </Card>
        ) : null}

        {busy ? <Text style={s.muted}>{tr('generating')}</Text> : null}

        <View style={s.sectionHead}>
          <Text style={s.section}>{tr('yourAiActivity')}</Text>
          <Text onPress={() => router.push('/ai-history')} style={s.link}>
            {tr('viewHistory')}
          </Text>
        </View>
        {aiHistory.length === 0 ? (
          <EmptyState title={tr('noAiActivity')} />
        ) : (
          aiHistory.slice(0, 5).map((item) => (
            <Card key={item.id} style={s.activity}>
              <View style={{ flex: 1 }}>
                <Text style={s.activityTitle}>{item.prompt}</Text>
                <Text style={s.muted}>
                  {tr(item.kind)} · {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            </Card>
          ))
        )}

        {!hasProAi(tier) ? (
          <Pressable style={s.pro} onPress={() => router.push('/subscription')}>
            <Text style={s.proTitle}>{tr('unlockAiMeter')}</Text>
            <Text style={s.proBody}>{tr('proBannerBody')}</Text>
            <Text style={s.proCta}>{tr('upgradeToPro')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F7F4FF' },
  scroll: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', fontWeight: '900', fontSize: 18, color: colors.ink },
  badge: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '900', color: colors.ink },
  hero: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: colors.ink, lineHeight: 34 },
  heroBody: { marginTop: 8, color: colors.muted, lineHeight: 20 },
  robot: { width: 92, height: 92 },
  create: { backgroundColor: colors.purple, borderRadius: 24, padding: 18, marginBottom: 18 },
  createTitle: { color: 'white', fontWeight: '800', marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
  },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  kinds: { gap: 8, marginTop: 14 },
  kind: { backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  kindOn: { backgroundColor: 'rgba(255,255,255,0.32)' },
  kindText: { color: 'white', fontWeight: '700', fontSize: 12 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  section: { fontWeight: '900', fontSize: 18, color: colors.ink },
  link: { color: colors.purple, fontWeight: '800' },
  examples: { gap: 10, paddingBottom: 12 },
  example: {
    width: 140,
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: 'white',
    padding: 12,
    justifyContent: 'flex-end',
  },
  exampleText: { fontWeight: '800', color: colors.ink },
  result: { marginTop: 8, color: colors.ink, lineHeight: 22 },
  muted: { color: colors.muted, marginTop: 4 },
  activity: { flexDirection: 'row' },
  activityTitle: { fontWeight: '800', color: colors.ink },
  pro: { backgroundColor: colors.purple, borderRadius: 22, padding: 18, marginTop: 8 },
  proTitle: { color: 'white', fontWeight: '900', fontSize: 18 },
  proBody: { color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  proCta: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    color: colors.purple,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
});
