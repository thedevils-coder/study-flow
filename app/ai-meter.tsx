import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { AccessError, ConfigurationError, userFacingError } from '@/lib/errors';
import { summarizeDailyUsage } from '@/lib/ai-usage';
import { canUseKind, dailyAiLimit, displayPlanLabel, hasProAccess } from '@/lib/entitlements';
import { formatRelativeTime, kindLabel } from '@/lib/dates';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { aiService } from '@/services/ai';
import type { AiKind } from '@/types';

const kinds: { id: AiKind; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'notes', label: 'Notes', icon: 'document-text-outline' },
  { id: 'summary', label: 'Summary', icon: 'list-outline' },
  { id: 'flashcards', label: 'Flashcards', icon: 'copy-outline' },
  { id: 'quiz', label: 'Quiz', icon: 'help-circle-outline' },
  { id: 'other', label: 'More', icon: 'ellipsis-horizontal' },
];

const suggestions: {
  kind: AiKind;
  title: string;
  prompt: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    kind: 'explain',
    title: 'Explain Quantum Physics',
    prompt: 'Explain quantum physics for a high-school student.',
    icon: 'planet-outline',
  },
  {
    kind: 'notes',
    title: 'Notes on Cell Division',
    prompt: 'Create structured study notes on cell division.',
    icon: 'git-network-outline',
  },
  {
    kind: 'summary',
    title: 'Summary of The Alchemist',
    prompt: 'Summarize The Alchemist for revision.',
    icon: 'book-outline',
  },
  {
    kind: 'quiz',
    title: 'Create Quiz on Photosynthesis',
    prompt: 'Create a short quiz on photosynthesis with answers.',
    icon: 'help-circle-outline',
  },
  {
    kind: 'flashcards',
    title: 'Flashcards on Newton’s Laws',
    prompt: 'Create flashcards for Newton’s three laws of motion.',
    icon: 'copy-outline',
  },
  {
    kind: 'notes',
    title: 'Notes on World War I',
    prompt: 'Create structured study notes on World War I.',
    icon: 'document-text-outline',
  },
];

const kindIcon = (kind: string): keyof typeof Ionicons.glyphMap => {
  if (kind === 'summary') return 'list-outline';
  if (kind === 'quiz') return 'help-circle-outline';
  if (kind === 'flashcards') return 'copy-outline';
  if (kind === 'leo') return 'chatbubble-ellipses-outline';
  if (kind === 'schedule') return 'calendar-outline';
  return 'document-text-outline';
};

export default function AiMeter() {
  const { session, tier } = useAuth();
  const { aiActivity, reloadAi } = useStudy();
  const { colors, theme } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<AiKind>('notes');
  const [loading, setLoading] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const limit = dailyAiLimit(tier);
  const [usage, setUsage] = useState(() => summarizeDailyUsage(aiActivity, limit));

  const visibleSuggestions = showAllSuggestions ? suggestions : suggestions.slice(0, 4);
  const recent = useMemo(() => aiActivity.slice(0, 3), [aiActivity]);

  useEffect(() => {
    const fallback = summarizeDailyUsage(aiActivity, dailyAiLimit(tier));
    setUsage(fallback);
    if (!session) return;
    void aiService
      .usageToday(session.id, dailyAiLimit(tier))
      .then(setUsage)
      .catch(() => setUsage(fallback));
  }, [aiActivity, session, tier]);

  const generate = async (nextKind: AiKind, nextPrompt: string) => {
    if (!session) return;
    const trimmed = nextPrompt.trim();
    if (!trimmed) {
      Alert.alert('AI Meter', 'Enter a prompt first.');
      return;
    }
    if (!canUseKind(tier, nextKind)) {
      router.push('/subscription');
      return;
    }
    setLoading(true);
    try {
      const result = await aiService.generate({ session, kind: nextKind, prompt: trimmed });
      await reloadAi();
      router.push(`/ai-result/${result.id}`);
    } catch (error) {
      if (error instanceof AccessError) {
        Alert.alert('Upgrade required', error.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'View plans', onPress: () => router.push('/subscription') },
        ]);
      } else if (error instanceof ConfigurationError) {
        Alert.alert('AI is not configured', error.message);
      } else {
        Alert.alert('AI Meter', userFacingError(error, 'Unable to generate that right now.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const cardFill = theme === 'dark' ? colors.card : '#F4F1FF';
  const pageBg = theme === 'dark' ? colors.background : '#FBFBFE';

  return (
    <Screen style={{ backgroundColor: pageBg }} contentStyle={styles.page}>
      <View style={styles.top}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.plainBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>AI Meter</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel="About AI Meter"
          onPress={() =>
            Alert.alert(
              'AI Meter',
              'Generate notes, summaries, flashcards and quizzes through a secure server. Usage counts successful generations only. API keys never live in the app.',
            )
          }
          style={styles.plainBtn}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.mutedText} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Your personal AI{'\n'}study assistant ✨
          </Text>
          <Text style={[styles.heroCopy, { color: colors.secondaryText }]}>
            Generate notes, summaries and smart schedules in seconds.
          </Text>
        </View>
        <View style={styles.robotWrap}>
          <Image source={require('../assets/images/leo-robot.png')} style={styles.robot} />
        </View>
      </View>

      <View style={[styles.usageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.usageTop}>
          <Text style={[styles.usageTitle, { color: colors.text }]}>Today’s AI usage</Text>
          <Text style={[styles.usagePlan, { color: colors.accent }]}>{displayPlanLabel(tier)}</Text>
        </View>
        <Text style={{ color: colors.secondaryText, marginBottom: 8 }}>
          {usage.used} of {usage.limit || 0} used · {usage.remaining} remaining
        </Text>
        <ProgressBar value={usage.limit ? (usage.used / usage.limit) * 100 : 0} />
        <Text style={{ color: colors.mutedText, marginTop: 8, fontSize: 12, lineHeight: 18 }}>
          Counts successful notes, quizzes, Leo replies, images and PDFs. Failed requests are not counted.
        </Text>
      </View>

      <View style={styles.create}>
        <Text style={styles.createLabel}>What do you want to create today?</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Example: Create notes on photosynthesis"
            placeholderTextColor="rgba(255,255,255,0.72)"
            style={styles.input}
            editable={!loading}
            returnKeyType="go"
            onSubmitEditing={() => void generate(kind, prompt)}
          />
          <Pressable
            accessibilityLabel="Generate"
            onPress={() => void generate(kind, prompt)}
            disabled={loading}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.kinds}>
          {kinds.map((item) => (
            <Pressable key={item.id} onPress={() => setKind(item.id)} style={styles.kind}>
              <Ionicons name={item.icon} size={16} color="#fff" />
              <Text style={[styles.kindText, kind === item.id && styles.kindActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.heading}>
        <Text style={[styles.section, { color: colors.text }]}>Try these</Text>
        <Pressable onPress={() => setShowAllSuggestions((value) => !value)} style={styles.inlineLink}>
          <Text style={[styles.link, { color: colors.accent }]}>
            {showAllSuggestions ? 'Show less' : 'See all'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestRow}>
        {visibleSuggestions.map((item) => (
          <Pressable
            key={item.title}
            onPress={() => void generate(item.kind, item.prompt)}
            style={[styles.suggestion, { backgroundColor: cardFill }]}
          >
            <View style={styles.suggestIcon}>
              <Ionicons name={item.icon} size={18} color="#7B5CFF" />
            </View>
            <Text style={[styles.suggestTitle, { color: colors.text }]}>{item.title}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.heading}>
        <Text style={[styles.section, { color: colors.text }]}>Your AI Activity</Text>
        <Pressable onPress={() => router.push('/ai-history')} style={styles.inlineLink}>
          <Text style={[styles.link, { color: colors.accent }]}>View history</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
        </Pressable>
      </View>

      {recent.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="No AI activity yet"
          message="Create your first AI study resource."
        />
      ) : (
        <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {recent.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.activityRow,
                index < recent.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
              ]}
            >
              <Pressable
                style={styles.activityMain}
                onPress={() => router.push(`/ai-result/${item.id}`)}
              >
                <View style={[styles.activityIcon, { backgroundColor: cardFill }]}>
                  <Ionicons name={kindIcon(item.kind)} size={18} color="#7B5CFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[styles.activityTitle, { color: colors.text }]}>
                    {item.prompt}
                  </Text>
                  <Text style={[styles.activityMeta, { color: colors.mutedText }]}>
                    Created {formatRelativeTime(item.createdAt)} • {kindLabel(item.kind)}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityLabel="Export"
                onPress={() =>
                  void Share.share({
                    message: `${item.prompt}\n\n${item.resultText}`,
                  })
                }
                style={styles.iconHit}
              >
                <Ionicons name="download-outline" size={18} color={colors.mutedText} />
              </Pressable>
              <Pressable
                accessibilityLabel="More actions"
                onPress={() =>
                  Alert.alert(item.prompt, undefined, [
                    { text: 'Open', onPress: () => router.push(`/ai-result/${item.id}`) },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await aiService.remove(item.id);
                          await reloadAi();
                        } catch (error) {
                          Alert.alert('AI Meter', userFacingError(error, 'Unable to delete that item.'));
                        }
                      },
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ])
                }
                style={styles.iconHit}
              >
                <Ionicons name="ellipsis-vertical" size={16} color={colors.mutedText} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => router.push('/ai-history')} style={styles.viewAll}>
            <Text style={[styles.link, { color: colors.accent }]}>View all</Text>
          </Pressable>
        </View>
      )}

      {!hasProAccess(tier) ? (
        <View style={styles.pro}>
          <Image source={require('../assets/images/leo-robot.png')} style={styles.proRobot} />
          <View style={{ flex: 1 }}>
            <View style={styles.proKickerRow}>
              <Ionicons name="star" size={12} color="#F5C518" />
              <Text style={styles.proKicker}>PRO</Text>
            </View>
            <Text style={styles.proTitle}>Unlock the full power of AI Meter</Text>
            <Text style={styles.proCopy}>
              Get unlimited generations, longer content and advanced study tools.
            </Text>
          </View>
          <Pressable onPress={() => router.push('/subscription')} style={styles.proButton}>
            <Text style={styles.proButtonText}>Upgrade to Pro</Text>
            <Ionicons name="chevron-forward" size={14} color="#5932E8" />
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 8, paddingBottom: 48 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  plainBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800' },
  badge: { backgroundColor: '#F5C518', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#15132A' },
  hero: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  heroTitle: { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  heroCopy: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  robotWrap: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#EEE9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  robot: { width: 96, height: 96, resizeMode: 'contain' },
  usageCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 16 },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  usageTitle: { fontSize: 16, fontWeight: '800' },
  usagePlan: { fontWeight: '800', fontSize: 13 },
  create: {
    backgroundColor: '#6B4BFF',
    borderRadius: 26,
    padding: 16,
    paddingBottom: 18,
    marginBottom: 8,
  },
  createLabel: { color: '#fff', fontWeight: '800', marginBottom: 12, fontSize: 14 },
  inputRow: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, color: '#fff', fontSize: 14 },
  kinds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  kind: { alignItems: 'center', gap: 6, minWidth: 56 },
  kindText: { color: 'rgba(255,255,255,0.78)', fontWeight: '700', fontSize: 12 },
  kindActive: { color: '#fff' },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 22,
  },
  section: { fontSize: 18, fontWeight: '800' },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { fontWeight: '800', fontSize: 13 },
  suggestRow: { paddingRight: 8 },
  suggestion: {
    width: 118,
    minHeight: 118,
    borderRadius: 20,
    padding: 14,
    marginRight: 10,
  },
  suggestIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(123,92,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  suggestTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  activityCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  activityMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 14, fontWeight: '800' },
  activityMeta: { fontSize: 12, marginTop: 3 },
  iconHit: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  viewAll: { alignItems: 'center', paddingVertical: 12 },
  pro: {
    marginTop: 18,
    backgroundColor: '#6B4BFF',
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
    minHeight: 132,
    justifyContent: 'center',
  },
  proRobot: {
    position: 'absolute',
    left: -18,
    bottom: -22,
    width: 110,
    height: 110,
    opacity: 0.35,
    resizeMode: 'contain',
  },
  proKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  proKicker: { color: '#F5C518', fontWeight: '900', fontSize: 12, letterSpacing: 0.6 },
  proTitle: { color: '#fff', fontSize: 18, fontWeight: '800', maxWidth: '78%' },
  proCopy: { color: 'rgba(255,255,255,0.86)', marginTop: 6, lineHeight: 18, maxWidth: '78%', fontSize: 13 },
  proButton: {
    position: 'absolute',
    right: 14,
    bottom: 16,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  proButtonText: { color: '#5932E8', fontWeight: '800', fontSize: 12 },
});
