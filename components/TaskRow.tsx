import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTime } from '@/lib/dates';
import { useTheme } from '@/providers/theme-provider';
import type { Task } from '@/types';

export function TaskRow({
  task,
  onToggle,
  onOpen,
  onDelete,
}: {
  task: Task;
  onToggle?: () => void;
  onOpen?: () => void;
  onDelete?: () => void;
}) {
  const { colors } = useTheme();
  const time = task.scheduledAt ? formatTime(new Date(task.scheduledAt)) : 'Any time';

  return (
    <Pressable onPress={onOpen} style={[styles.row, { borderColor: colors.divider }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        onPress={onToggle}
        hitSlop={8}
      >
        <Ionicons
          name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={task.completed ? colors.success : colors.accent}
        />
      </Pressable>
      <View style={styles.body}>
        <Text
          style={[
            styles.title,
            { color: task.completed ? colors.mutedText : colors.text },
            task.completed && styles.done,
          ]}
        >
          {task.title}
        </Text>
        <Text style={[styles.time, { color: colors.mutedText }]}>{time}</Text>
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel="Delete task">
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  done: { textDecorationLine: 'line-through' },
  time: { fontSize: 12, marginTop: 3 },
});
