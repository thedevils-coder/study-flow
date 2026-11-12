import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { goalPercent } from '@/lib/progress';
import { formatShortDate } from '@/lib/dates';
import { useTheme } from '@/providers/theme-provider';
import type { StudyGoal } from '@/types';

export function GoalCard({
  goal,
  onPress,
}: {
  goal: StudyGoal;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const percent = goalPercent(goal);
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{goal.title}</Text>
          <Text style={[styles.percent, { color: colors.accent }]}>{percent}%</Text>
        </View>
        <ProgressBar value={percent} />
        <Text style={[styles.meta, { color: colors.secondaryText }]}>
          {goal.currentValue} / {goal.targetValue} {goal.unit}
          {goal.dueAt ? ` · due ${formatShortDate(new Date(goal.dueAt))}` : ''}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '800' },
  percent: { fontWeight: '800' },
  meta: { marginTop: 8, fontSize: 13 },
});
