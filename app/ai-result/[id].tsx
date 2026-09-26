import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { generationBelongsToUser } from '@/lib/leo-isolation';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { aiService } from '@/services/ai';
import type { AiActivity } from '@/types';

export default function AiResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { aiActivity } = useStudy();
  const { colors } = useTheme();
  const [item, setItem] = useState<AiActivity | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (!session?.id) {
      setItem(undefined);
      setError('This AI result is no longer available.');
      return;
    }

    const cached = aiActivity.find((entry) => entry.id === id);
    if (cached && generationBelongsToUser(cached, session.id)) {
      setItem(cached);
      setError(null);
      return;
    }

    let cancelled = false;
    setItem(undefined);
    setError(null);
    aiService
      .get(id, session.id)
      .then((next) => {
        if (cancelled) return;
        if (!generationBelongsToUser(next, session.id)) {
          setItem(undefined);
          setError('This AI result is no longer available.');
          return;
        }
        setItem(next);
      })
      .catch(() => {
        if (cancelled) return;
        setItem(undefined);
        setError('This AI result is no longer available.');
      });
    return () => {
      cancelled = true;
    };
  }, [aiActivity, id, session?.id]);

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="AI result" back />
        <ErrorState message={error} />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <ScreenHeader title="AI result" back />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={item.relatedFeature} back />
      <Text style={[styles.prompt, { color: colors.text }]}>{item.prompt}</Text>
      <Text style={{ color: colors.mutedText, marginBottom: 16 }}>{new Date(item.createdAt).toLocaleString()}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{item.resultText || 'No output was stored for this activity.'}</Text>
      {item.resultText ? (
        <Button
          label="Share / export"
          variant="secondary"
          onPress={() => void Share.share({ message: `${item.prompt}\n\n${item.resultText}` })}
          style={{ marginTop: 20 }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  body: { fontSize: 16, lineHeight: 24 },
});
