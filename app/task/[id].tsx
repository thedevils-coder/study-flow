import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { combineDateAndTime, formatDate, formatTime } from '@/lib/dates';
import { userFacingError } from '@/lib/errors';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, updateTask, deleteTask } = useStudy();
  const { colors } = useTheme();
  const task = useMemo(() => tasks.find((item) => item.id === id), [tasks, id]);
  const [title, setTitle] = useState(task?.title ?? '');
  const [date, setDate] = useState(task?.scheduledAt ? new Date(task.scheduledAt) : new Date());
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [saving, setSaving] = useState(false);

  if (!task) {
    return (
      <Screen>
        <ScreenHeader title="Task" back />
        <Text style={{ color: colors.secondaryText }}>This task is no longer available.</Text>
      </Screen>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await updateTask(task.id, { title, scheduledAt: date });
      router.back();
    } catch (error) {
      Alert.alert('Task', userFacingError(error, 'Unable to update the task.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Edit task" back />
      <Input label="Title" value={title} onChangeText={setTitle} />
      <Pressable onPress={() => setPicker('date')} style={[styles.field, { borderColor: colors.inputBorder, backgroundColor: colors.input }]}>
        <Text style={{ color: colors.mutedText, fontWeight: '700' }}>Date</Text>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{formatDate(date)}</Text>
      </Pressable>
      <Pressable onPress={() => setPicker('time')} style={[styles.field, { borderColor: colors.inputBorder, backgroundColor: colors.input }]}>
        <Text style={{ color: colors.mutedText, fontWeight: '700' }}>Time</Text>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{formatTime(date)}</Text>
      </Pressable>
      {picker ? (
        <DateTimePicker
          value={date}
          mode={picker}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            if (Platform.OS !== 'ios') setPicker(null);
            if (!selected) return;
            setDate((current) => (picker === 'date' ? combineDateAndTime(selected, current) : combineDateAndTime(current, selected)));
          }}
        />
      ) : null}
      <Button
        label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        variant="secondary"
        onPress={() => void updateTask(task.id, { completed: !task.completed })}
      />
      <Button label="Save changes" onPress={() => void save()} loading={saving} style={{ marginTop: 12 }} />
      <Button
        label="Delete task"
        variant="danger"
        style={{ marginTop: 12 }}
        onPress={() =>
          Alert.alert('Delete task', `Delete “${task.title}”?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await deleteTask(task.id);
                router.back();
              },
            },
          ])
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
