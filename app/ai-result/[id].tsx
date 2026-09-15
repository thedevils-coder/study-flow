import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { aiService } from '@/services/ai';
import type { AiActivity } from '@/types';

export default function AiResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { aiActivity } = useStudy();
  const { colors } = useTheme();
  const [item, setItem] = useState<AiActivity | undefined>(aiActivity.find((entry) => entry.id === id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item || !id) return;
    aiService
      .get(id)
      .then(setItem)
      .catch(() => setError('This AI result is no longer available.'));
  }, [id, item]);

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
