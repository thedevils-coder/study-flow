import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { LeoMarkdown } from '@/components/LeoMarkdown';
import type { AiArtifact, AiSource, ChatMessage } from '@/lib/ai-types';
import { artifactHref } from '@/lib/ai-artifacts';
import { useTheme } from '@/providers/theme-provider';

async function shareArtifact(artifact: AiArtifact) {
  const href = artifactHref(artifact);
  if (!href) {
    Alert.alert('Leo', 'This file is no longer available.');
    return;
  }
  if (href.startsWith('http') && (await Sharing.isAvailableAsync())) {
    try {
      await Sharing.shareAsync(href, { mimeType: artifact.mime, dialogTitle: artifact.name });
      return;
    } catch {
      // Fall through to the system share sheet / open.
    }
  }
  if (href.startsWith('http')) {
    await Linking.openURL(href);
    return;
  }
  await Sharing.shareAsync(href, { mimeType: artifact.mime, dialogTitle: artifact.name }).catch(() => {
    Alert.alert('Leo', 'Unable to share that file on this device.');
  });
}

function Sources({ sources }: { sources: AiSource[] }) {
  const { colors } = useTheme();
  if (!sources.length) return null;
  return (
    <View style={{ marginTop: 12, gap: 6 }}>
      <Text style={{ color: colors.secondaryText, fontWeight: '800', fontSize: 12 }}>Sources</Text>
      {sources.map((source) => (
        <Pressable
          key={source.url}
          accessibilityRole="link"
          accessibilityLabel={`Open source ${source.title}`}
          onPress={() => void Linking.openURL(source.url)}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: colors.accent, fontWeight: '700' }}>{source.title}</Text>
          <Text style={{ color: colors.mutedText, fontSize: 12 }}>{source.domain || source.url}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Artifacts({ artifacts }: { artifacts: AiArtifact[] }) {
  const { colors } = useTheme();
  if (!artifacts.length) return null;
  return (
    <View style={{ marginTop: 12, gap: 10 }}>
      {artifacts.map((artifact) => {
        const href = artifactHref(artifact);
        if (artifact.type === 'image' && href) {
          return (
            <View key={artifact.name} style={{ gap: 8 }}>
              <Image source={{ uri: href }} style={styles.image} accessibilityLabel={artifact.name} />
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Retry is on the message" onPress={() => void shareArtifact(artifact)} style={styles.action}>
                  <Ionicons name="share-outline" size={16} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontWeight: '800' }}>Share</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Save or open image" onPress={() => href && void Linking.openURL(href)} style={styles.action}>
                  <Ionicons name="download-outline" size={16} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontWeight: '800' }}>Save</Text>
                </Pressable>
              </View>
            </View>
          );
        }
        return (
          <View key={artifact.name} style={[styles.pdf, { borderColor: colors.border, backgroundColor: colors.accentSoft }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>PDF ready</Text>
            <Text style={{ color: colors.secondaryText, marginTop: 4 }}>{artifact.name}</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open PDF"
                onPress={() => href && void Linking.openURL(href)}
                style={styles.action}
              >
                <Ionicons name="open-outline" size={16} color={colors.accent} />
                <Text style={{ color: colors.accent, fontWeight: '800' }}>Open</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Save PDF" onPress={() => href && void Linking.openURL(href)} style={styles.action}>
                <Ionicons name="download-outline" size={16} color={colors.accent} />
                <Text style={{ color: colors.accent, fontWeight: '800' }}>Save</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Share PDF" onPress={() => void shareArtifact(artifact)} style={styles.action}>
                <Ionicons name="share-outline" size={16} color={colors.accent} />
                <Text style={{ color: colors.accent, fontWeight: '800' }}>Share</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function LeoMessageBubble({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  const loading = message.status === 'sending' || message.status === 'streaming';

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.leoRow]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.accent, alignSelf: 'flex-end' }
            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, alignSelf: 'flex-start' },
        ]}
      >
        <Text style={[styles.who, { color: isUser ? 'rgba(255,255,255,0.8)' : colors.mutedText }]}>
          {isUser ? 'You' : 'Leo'}
        </Text>
        {isUser ? (
          <Text style={{ color: '#fff', fontSize: 16, lineHeight: 22 }}>{message.content}</Text>
        ) : loading && !message.content ? (
          <Text style={{ color: colors.secondaryText }}>{message.error || 'Leo is thinking…'}</Text>
        ) : message.content ? (
          <LeoMarkdown text={message.content} />
        ) : null}
        {!isUser ? <Sources sources={message.sources ?? []} /> : null}
        {!isUser ? <Artifacts artifacts={message.artifacts ?? []} /> : null}
        {message.status === 'error' ? (
          <View style={{ marginTop: 10, gap: 8 }}>
            <Text style={{ color: colors.danger, lineHeight: 20 }}>
              {message.error || "Leo couldn't complete that request. Please try again."}
            </Text>
            {onRetry ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry"
                onPress={onRetry}
                style={[styles.retry, { borderColor: colors.danger }]}
              >
                <Text style={{ color: colors.danger, fontWeight: '800' }}>Retry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 12, maxWidth: '100%' },
  userRow: { alignItems: 'flex-end' },
  leoRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '88%', borderRadius: 18, padding: 12 },
  who: { fontSize: 11, fontWeight: '800', marginBottom: 6, letterSpacing: 0.4 },
  image: { width: '100%', height: 220, borderRadius: 12, backgroundColor: '#EEE9FF' },
  pdf: { borderWidth: 1, borderRadius: 14, padding: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  retry: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
