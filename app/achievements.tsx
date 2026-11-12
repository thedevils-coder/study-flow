import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';

export default function Achievements() {
  const { achievements } = useStudy();
  const { colors } = useTheme();

  return (
    <Screen>
      <ScreenHeader title="Achievements" back />
      {achievements.map((item) => (
        <Card key={item.id}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={{ color: colors.secondaryText, marginTop: 4 }}>{item.description}</Text>
            </View>
            <Text style={{ color: item.earned ? colors.success : colors.mutedText, fontWeight: '800' }}>
              {item.earned ? 'Unlocked' : 'Locked'}
            </Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800' },
});
