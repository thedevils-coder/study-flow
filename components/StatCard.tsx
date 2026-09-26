import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { useTheme } from '@/providers/theme-provider';

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <Text style={[styles.label, { color: colors.secondaryText }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      {hint ? <Text style={[styles.hint, { color: colors.mutedText }]}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, marginBottom: 0 },
  label: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 22, fontWeight: '900', marginTop: 6 },
  hint: { fontSize: 12, marginTop: 4 },
});
