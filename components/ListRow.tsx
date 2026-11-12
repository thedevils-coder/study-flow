import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

export function ListRow({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { borderBottomColor: colors.divider }]}
    >
      <View style={[styles.icon, { backgroundColor: danger ? colors.dangerSoft : colors.accentSoft }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.accent} />
      </View>
      <Text style={[styles.label, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
      {value ? <Text style={[styles.value, { color: colors.mutedText }]}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.mutedText} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  icon: { padding: 8, borderRadius: 10 },
  label: { flex: 1, fontWeight: '700', fontSize: 15 },
  value: { fontSize: 13 },
});
