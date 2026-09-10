import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text } from 'react-native';
import { Card, EmptyState, ThemedSafeArea } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { formatDateTime, t } from '@/i18n';
import { useColors } from '@/lib/use-colors';
import { canDownloadAi, getTier } from '@/lib/entitlements';

export default function AiHistory() {
  const { session, aiHistory, deleteAiGeneration } = useApp();
  const tr = (key: string) => t(session!.language, key);
  const palette = useColors();
  const language = session!.language;
  const tier = getTier(session);

  return (
    <ThemedSafeArea>
      <ScrollView contentContainerStyle={s.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={[s.back, { color: palette.purple }]}>{tr('back')}</Text>
        </Pressable>
        <Text style={[s.title, { color: palette.ink }]}>{tr('yourAiActivity')}</Text>
        {aiHistory.length === 0 ? (
          <EmptyState title={tr('noAiActivity')} />
        ) : (
          aiHistory.map((item) => (
            <Card key={item.id}>
              <Text style={[s.kind, { color: palette.purple }]}>{tr(item.kind)}</Text>
              <Text style={[s.prompt, { color: palette.ink }]}>{item.prompt}</Text>
              <Text style={[s.body, { color: palette.ink }]}>{item.resultText}</Text>
              <Text style={[s.muted, { color: palette.muted }]}>{formatDateTime(language, item.createdAt)}</Text>
              {canDownloadAi(tier) ? (
                <Text style={[s.link, { color: palette.purple }]} onPress={() => Share.share({ message: item.resultText })}>
                  {tr('download')}
                </Text>
              ) : null}
              <Text
                style={[s.delete, { color: palette.danger }]}
                onPress={() =>
                  Alert.alert(tr('deleteHistory'), tr('confirmDelete'), [
                    { text: tr('cancel'), style: 'cancel' },
                    {
                      text: tr('deleteHistory'),
                      style: 'destructive',
                      onPress: () => deleteAiGeneration(item.id),
                    },
                  ])
                }
              >
                {tr('deleteHistory')}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </ThemedSafeArea>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  back: { fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '900', marginVertical: 12 },
  kind: { fontWeight: '800', fontSize: 12 },
  prompt: { fontWeight: '800', marginTop: 6 },
  body: { marginTop: 8, lineHeight: 20 },
  muted: { marginTop: 8, fontSize: 12 },
  link: { fontWeight: '800', marginTop: 10 },
  delete: { fontWeight: '800', marginTop: 8 },
});
