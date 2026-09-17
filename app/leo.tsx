import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LeoMessageBubble } from '@/components/LeoMessage';
import { Screen } from '@/components/Screen';
import { TestStateNotice } from '@/components/TestStateNotice';
import { BRAND } from '@/constants/brand';
import { classifyRequest } from '@/lib/ai-router';
import { conversationForRetry, newMessageId } from '@/lib/ai-retry';
import type { AiAttachment, ChatMessage, DetailLevel } from '@/lib/ai-types';
import { AccessError, ConfigurationError } from '@/lib/errors';
import { userLeoError } from '@/lib/ai-errors';
import { canUseKind } from '@/lib/entitlements';
import { TESTER_COPY, isTesterBuildEnabled, isTesterSession } from '@/lib/tester';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { aiService } from '@/services/ai';

const STORAGE_KEY = 'studyflow.leo.conversation.v1';
const DETAILS: { id: DetailLevel; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'detailed', label: 'Detailed' },
];

async function readUriAsBase64(uri: string) {
  return new File(uri).base64();
}

function kindFromMime(mime: string, name: string): AiAttachment['kind'] {
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name)) return 'image';
  if (mime.includes('pdf') || /\.pdf$/i.test(name)) return 'pdf';
  return 'text';
}

export default function Leo() {
  const { session, tier } = useAuth();
  const { tasks, goals, progress, reloadAi } = useStudy();
  const { colors } = useTheme();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('balanced');
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const lastAttachments = useRef<AiAttachment[]>([]);
  const [conversationId, setConversationId] = useState(newMessageId());
  const [busy, setBusy] = useState(false);
  const [statusLabel, setStatusLabel] = useState('');
  const restored = useRef(false);

  const studyContext = useMemo(
    () => ({
      tasks: tasks.slice(0, 20).map((task) => ({ title: task.title, scheduledAt: task.scheduledAt, completed: task.completed })),
      goals: goals.slice(0, 10).map((goal) => ({ title: goal.title, current: goal.currentValue, target: goal.targetValue })),
      focusMinutesThisWeek: Math.round(progress.weekSeconds / 60),
    }),
    [tasks, goals, progress.weekSeconds],
  );

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { conversationId?: string; messages?: ChatMessage[] };
        if (parsed.conversationId) setConversationId(parsed.conversationId);
        if (Array.isArray(parsed.messages)) {
          setMessages(parsed.messages.filter((item) => item.status !== 'streaming' && item.status !== 'sending'));
        }
      } catch {
        // Ignore a corrupt local conversation cache.
      }
    });
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ conversationId, messages }));
  }, [conversationId, messages]);

  const scrollToEnd = () => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const addAttachmentFromAsset = async (asset: { uri: string; mimeType?: string | null; name?: string | null; base64?: string | null }) => {
    const name = asset.name || asset.uri.split('/').pop() || 'attachment';
    const mime = asset.mimeType || (/\.pdf$/i.test(name) ? 'application/pdf' : 'image/jpeg');
    const dataBase64 = asset.base64 || (await readUriAsBase64(asset.uri));
    if (dataBase64.length > 2_800_000) {
      Alert.alert('Leo', 'Please choose a smaller file (about 2 MB or less).');
      return;
    }
    setAttachments((current) => [{ name, mime, kind: kindFromMime(mime, name), dataBase64 }, ...current].slice(0, 2));
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    await addAttachmentFromAsset(result.assets[0]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await addAttachmentFromAsset({
      uri: asset.uri,
      mimeType: asset.mimeType,
      name: asset.fileName,
      base64: asset.base64,
    });
  };

  const resetConversation = () => {
    setMessages([]);
    setAttachments([]);
    lastAttachments.current = [];
    setConversationId(newMessageId());
    setPrompt('');
    setStatusLabel('');
  };

  const send = useCallback(
    async (text: string, historyOverride?: ChatMessage[], assistantId?: string) => {
      if (!session) return;
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      if (!canUseKind(tier, 'leo')) {
        router.push('/subscription');
        return;
      }

      const history = historyOverride ?? messages;
      const route = classifyRequest(trimmed, {
        preferredDetail: detailLevel,
        history,
        hasAttachments: (attachments.length || lastAttachments.current.length) > 0,
      });
      const files = attachments.length ? attachments : lastAttachments.current;
      const pendingId = assistantId ?? newMessageId();
      const nextMessages = historyOverride
        ? historyOverride.filter((item) => item.id !== pendingId)
        : [
            ...messages,
            {
              id: newMessageId(),
              role: 'user' as const,
              content: trimmed,
              status: 'complete' as const,
            },
          ];
      const pending: ChatMessage = {
        id: pendingId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        detailLevel: route.detailLevel,
        error: route.loadingLabel,
      };

      setBusy(true);
      setStatusLabel(route.loadingLabel);
      setPrompt('');
      setAttachments([]);
      if (files.length) lastAttachments.current = files;
      setMessages([...nextMessages.filter((item) => item.id !== pendingId), pending]);
      scrollToEnd();

      try {
        const result = await aiService.chat({
          session,
          prompt: trimmed,
          history: nextMessages[nextMessages.length - 1]?.role === 'user' ? nextMessages.slice(0, -1) : nextMessages,
          attachments: files,
          detailLevel,
          conversationId,
          context: studyContext,
          onStatus: setStatusLabel,
          onDelta: (chunk) => {
            setMessages((current) =>
              current.map((item) =>
                item.id === pendingId ? { ...item, content: `${item.content}${chunk}`, status: 'streaming', error: undefined } : item,
              ),
            );
            scrollToEnd();
          },
        });
        setMessages((current) =>
          current.map((item) =>
            item.id === pendingId
              ? {
                  ...item,
                  content: result.answer || result.text,
                  status: 'complete',
                  responseType: result.responseType,
                  detailLevel: result.detailLevel,
                  grounded: result.grounded,
                  sources: result.sources,
                  artifacts: result.artifacts,
                  generationId: result.id,
                  error: undefined,
                }
              : item,
          ),
        );
        await reloadAi();
      } catch (error) {
        const message = userLeoError(error);
        if (error instanceof AccessError) {
          Alert.alert('Leo', message, [
            { text: 'Not now', style: 'cancel' },
            { text: 'View plans', onPress: () => router.push('/subscription') },
          ]);
        } else if (error instanceof ConfigurationError) {
          Alert.alert('Leo is not configured', message);
        }
        setMessages((current) =>
          current.map((item) =>
            item.id === pendingId
              ? { ...item, status: 'error', error: message || "Leo couldn't complete that request. Please try again." }
              : item,
          ),
        );
      } finally {
        setBusy(false);
        setStatusLabel('');
      }
    },
    [attachments, busy, conversationId, detailLevel, messages, reloadAi, session, studyContext, tier],
  );

  const retryLast = () => {
    const retry = conversationForRetry(messages);
    if (!retry.prompt) return;
    void send(retry.prompt, retry.history, retry.assistantMessageId);
  };

  const empty = messages.length === 0;

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.title, { color: colors.text }]}>{BRAND.assistant}</Text>
            <Text style={{ color: colors.mutedText, fontSize: 12 }}>Study assistant</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Start a new conversation" onPress={resetConversation} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        {isTesterBuildEnabled() && isTesterSession(session) ? <TestStateNotice message={TESTER_COPY.ai} /> : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          ListEmptyComponent={
            <View style={styles.hero}>
              <Image source={require('../assets/images/leo-robot.png')} style={styles.robot} />
              <Text style={[styles.hello, { color: colors.text }]}>Hi, I’m Leo.</Text>
              <Text style={{ color: colors.secondaryText, textAlign: 'center', lineHeight: 22 }}>
                Ask naturally. I can explain, simplify, quiz you, research current topics, create diagrams and make PDFs — all in this conversation.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <LeoMessageBubble message={item} onRetry={item.status === 'error' ? retryLast : undefined} />
          )}
        />

        {busy ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.secondaryText, flex: 1 }}>{statusLabel || 'Leo is thinking…'}</Text>
          </View>
        ) : null}

        {attachments.length || lastAttachments.current.length ? (
          <View style={styles.attachRow}>
            {(attachments.length ? attachments : lastAttachments.current).map((file) => (
              <View key={file.name} style={[styles.chip, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name={file.kind === 'image' ? 'image-outline' : 'document-outline'} size={14} color={colors.accent} />
                <Text style={{ color: colors.text, fontWeight: '700', maxWidth: 140 }} numberOfLines={1}>
                  {file.name}
                </Text>
              </View>
            ))}
            {attachments.length ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Remove attachments" onPress={() => setAttachments([])}>
                <Text style={{ color: colors.danger, fontWeight: '800' }}>Remove</Text>
              </Pressable>
            ) : (
              <Text style={{ color: colors.mutedText, fontSize: 12 }}>Kept for follow-up questions</Text>
            )}
          </View>
        ) : null}

        <View style={styles.details}>
          {DETAILS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} answers`}
              onPress={() => setDetailLevel(item.id)}
              style={[
                styles.detail,
                { borderColor: colors.border, backgroundColor: detailLevel === item.id ? colors.accentSoft : colors.card },
              ]}
            >
              <Text style={{ color: detailLevel === item.id ? colors.accent : colors.secondaryText, fontWeight: '800' }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Attach a study file" onPress={() => void pickDocument()} style={styles.iconBtn}>
            <Ionicons name="attach-outline" size={22} color={colors.accent} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Attach a study photo" onPress={() => void pickImage()} style={styles.iconBtn}>
            <Ionicons name="image-outline" size={20} color={colors.accent} />
          </Pressable>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder={empty ? 'Ask Leo anything…' : 'Ask a follow-up…'}
            placeholderTextColor={colors.mutedText}
            style={[styles.input, { color: colors.text }]}
            multiline
            editable={!busy}
            onSubmitEditing={() => void send(prompt)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            onPress={() => void send(prompt)}
            disabled={busy || !prompt.trim()}
            style={[styles.send, { backgroundColor: colors.accent, opacity: busy || !prompt.trim() ? 0.5 : 1 }]}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 12, flexGrow: 1 },
  hero: { alignItems: 'center', marginTop: 24, gap: 8, paddingHorizontal: 12 },
  robot: { width: 96, height: 96, resizeMode: 'contain' },
  hello: { fontSize: 26, fontWeight: '900' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  attachRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, minHeight: 32 },
  details: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  detail: { flex: 1, minHeight: 40, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingVertical: 10, fontSize: 16 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});
