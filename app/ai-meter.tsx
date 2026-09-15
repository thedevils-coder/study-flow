import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { AccessError, ConfigurationError, userFacingError } from '@/lib/errors';
import { canUseKind, hasProAccess } from '@/lib/entitlements';
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

const suggestions = [
  { kind: 'explain' as AiKind, title: 'Explain Quantum Physics', prompt: 'Explain quantum physics for a high-school student.' },
  { kind: 'notes' as AiKind, title: 'Notes on Cell Division', prompt: 'Create structured study notes on cell division.' },
  { kind: 'summary' as AiKind, title: 'Summary of The Alchemist', prompt: 'Summarize The Alchemist for revision.' },
  { kind: 'quiz' as AiKind, title: 'Create Quiz on Photosynthesis', prompt: 'Create a short quiz on photosynthesis with answers.' },
];

export default function AiMeter() {
  const { session, tier } = useAuth();
  const { aiActivity, reloadAi } = useStudy();
  const { colors } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<AiKind>('notes');
  const [loading, setLoading] = useState(false);

  const generate = async (nextKind: AiKind, nextPrompt: string) => {
    if (!session) return;
    if (!canUseKind(tier, nextKind)) {
      router.push('/subscription');
      return;
    }
    setLoading(true);
    try {
      const result = await aiService.generate({ session, kind: nextKind, prompt: nextPrompt });
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

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>AI Meter</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
        </View>
        <Pressable
          onPress={() =>
            Alert.alert(
              'AI Meter',
              'AI Meter generates notes, summaries, flashcards and quizzes through a secure server. API keys never live in the app.',
            )
          }
          style={[styles.iconBtn, { backgroundColor: colors.accentSoft }]}
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Your personal AI study assistant</Text>
          <Text style={{ color: colors.secondaryText, marginTop: 8, lineHeight: 20 }}>
            Generate notes, summaries and smart schedules in seconds.
          </Text>
        </View>
        <Image source={require('../assets/images/leo-robot.png')} style={styles.robot} />
      </View>

      <View style={styles.create}>
        <Text style={styles.createLabel}>What do you want to create today?</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Example: Create notes on photosynthesis"
            placeholderTextColor="rgba(255,255,255,0.7)"
            style={styles.input}
          />
          <Pressable onPress={() => void generate(kind, prompt)} disabled={loading}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kinds}>
          {kinds.map((item) => (
            <Pressable key={item.id} onPress={() => setKind(item.id)} style={styles.kind}>
              <Ionicons name={item.icon} size={16} color="#fff" />
              <Text style={[styles.kindText, kind === item.id && styles.kindActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.heading}>
        <Text style={[styles.section, { color: colors.text }]}>Try these</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {suggestions.map((item) => (
          <Pressable
            key={item.title}
            onPress={() => void generate(item.kind, item.prompt)}
            style={[styles.suggestion, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.title}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.heading}>
        <Text style={[styles.section, { color: colors.text }]}>Your AI Activity</Text>
        <Pressable onPress={() => router.push('/ai-history')}>
          <Text style={{ color: colors.accent, fontWeight: '800' }}>View history</Text>
        </Pressable>
      </View>

      {aiActivity.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="No AI activity yet"
          message="Create your first AI study resource."
        />
      ) : (
        aiActivity.slice(0, 3).map((item) => (
          <Card key={item.id}>
            <Pressable onPress={() => router.push(`/ai-result/${item.id}`)}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{item.prompt}</Text>
              <Text style={{ color: colors.secondaryText, marginTop: 4 }}>
                {item.relatedFeature} · {item.kind}
              </Text>
            </Pressable>
          </Card>
        ))
      )}

      {!hasProAccess(tier) ? (
        <View style={styles.pro}>
          <Text style={styles.proKicker}>PRO</Text>
          <Text style={styles.proTitle}>Unlock the full power of AI Meter</Text>
          <Text style={styles.proCopy}>Get unlimited generations, longer content and advanced study tools.</Text>
          <Button label="Upgrade to Pro" onPress={() => router.push('/subscription')} style={{ marginTop: 12 }} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800' },
  badge: { backgroundColor: '#F5C518', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  hero: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 8 },
  heroTitle: { fontSize: 28, fontWeight: '900', lineHeight: 34 },
  robot: { width: 92, height: 92, resizeMode: 'contain' },
  create: { backgroundColor: '#5932E8', borderRadius: 24, padding: 16, marginBottom: 22 },
  createLabel: { color: '#fff', fontWeight: '800', marginBottom: 12 },
  inputRow: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  kinds: { gap: 16, marginTop: 14 },
  kind: { alignItems: 'center', gap: 6, minWidth: 64 },
  kindText: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 12 },
  kindActive: { color: '#fff' },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 18 },
  section: { fontSize: 18, fontWeight: '800' },
  suggestion: { width: 140, minHeight: 96, borderRadius: 18, borderWidth: 1, padding: 12, marginRight: 10 },
  pro: { backgroundColor: '#5932E8', borderRadius: 22, padding: 18, marginTop: 8 },
  proKicker: { color: '#F5C518', fontWeight: '900', marginBottom: 6 },
  proTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  proCopy: { color: 'rgba(255,255,255,0.85)', marginTop: 6, lineHeight: 20 },
});
