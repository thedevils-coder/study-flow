import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { TESTER_COPY } from '@/lib/tester';

export function TestStateNotice({
  title,
  message,
}: {
  title?: string;
  message: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { borderColor: colors.warning, backgroundColor: colors.accentSoft }]}>
      <Text style={[styles.badge, { color: colors.warning }]}>{TESTER_COPY.badge}</Text>
      {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
      <Text style={[styles.message, { color: colors.secondaryText }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '800',
  },
  message: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
});
