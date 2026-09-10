import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, EmptyState } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { canDownloadAi, getTier } from '@/lib/entitlements';

export default function AiHistory() {
  const { session, aiHistory, deleteAiGeneration } = useApp();
  const tr = (key: string) => t(session!.language, key);
  const tier = getTier(session);

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.back}>{tr('back')}</Text>
        </Pressable>
        <Text style={s.title}>{tr('yourAiActivity')}</Text>
        {aiHistory.length === 0 ? (
          <EmptyState title={tr('noAiActivity')} />
        ) : (
          aiHistory.map((item) => (
            <Card key={item.id}>
              <Text style={s.kind}>{tr(item.kind)}</Text>
              <Text style={s.prompt}>{item.prompt}</Text>
              <Text style={s.body}>{item.resultText}</Text>
              <Text style={s.muted}>{new Date(item.createdAt).toLocaleString()}</Text>
              {canDownloadAi(tier) ? (
                <Text style={s.link} onPress={() => Share.share({ message: item.resultText })}>
                  {tr('download')}
                </Text>
              ) : null}
              <Text
                style={s.delete}
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: 20, paddingBottom: 40 },
  back: { color: colors.purple, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink, marginVertical: 12 },
  kind: { color: colors.purple, fontWeight: '800', fontSize: 12 },
  prompt: { fontWeight: '800', color: colors.ink, marginTop: 6 },
  body: { marginTop: 8, color: colors.ink, lineHeight: 20 },
  muted: { color: colors.muted, marginTop: 8, fontSize: 12 },
  link: { color: colors.purple, fontWeight: '800', marginTop: 10 },
  delete: { color: colors.danger, fontWeight: '800', marginTop: 8 },
});
