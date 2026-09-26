import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { combineDateAndTime, formatDate, formatTime } from '@/lib/dates';
import { userFacingError } from '@/lib/errors';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';

export default function NewTask() {
  const { createTask } = useStudy();
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      await createTask(title, date);
      router.back();
    } catch (error) {
      Alert.alert('Task', userFacingError(error, 'Unable to save the task.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="New task" back />
      <Input label="Title" value={title} onChangeText={setTitle} placeholder="Read chapter 4" />
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
      {Platform.OS === 'ios' && picker ? (
        <Button label="Done" variant="ghost" onPress={() => setPicker(null)} />
      ) : null}
      <Button label="Save task" onPress={() => void save()} loading={saving} />
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
