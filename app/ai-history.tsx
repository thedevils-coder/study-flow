import { router } from 'expo-router';
import { Alert, Pressable, Share, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { userFacingError } from '@/lib/errors';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { aiService } from '@/services/ai';

export default function AiHistory() {
  const { aiActivity, reloadAi } = useStudy();
  const { colors } = useTheme();

  return (
    <Screen>
      <ScreenHeader title="AI History" back />
      {aiActivity.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="No AI activity yet"
          message="Create your first AI study resource."
          actionLabel="Open AI Meter"
          onAction={() => router.push('/ai-meter')}
        />
      ) : (
        aiActivity.map((item) => (
          <Card key={item.id}>
            <Pressable onPress={() => router.push(`/ai-result/${item.id}`)}>
              <Text style={[styles.title, { color: colors.text }]}>{item.prompt}</Text>
              <Text style={{ color: colors.secondaryText, marginTop: 4 }}>
                {item.relatedFeature} · {new Date(item.createdAt).toLocaleString()}
              </Text>
              {item.summary ? (
                <Text style={{ color: colors.mutedText, marginTop: 8 }}>{item.summary}</Text>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert('AI activity', item.prompt, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Share', onPress: () => void Share.share({ message: `${item.prompt}\n\n${item.resultText}` }) },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await aiService.remove(item.id);
                        await reloadAi();
                      } catch (error) {
                        Alert.alert('AI History', userFacingError(error, 'Unable to delete that item.'));
                      }
                    },
                  },
                ])
              }
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: colors.accent, fontWeight: '800' }}>Actions</Text>
            </Pressable>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '800' },
});
