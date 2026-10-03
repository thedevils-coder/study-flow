import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatDate, formatTime } from '@/lib/dates';
import { userFacingError } from '@/lib/errors';
import { useStudy } from '@/providers/study-provider';

export default function NewTask() {
  const { createTask } = useStudy();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

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
      <DateTimeField
        label="Date"
        mode="date"
        value={date}
        displayText={formatDate(date)}
        onChange={setDate}
      />
      <DateTimeField
        label="Time"
        mode="time"
        value={date}
        displayText={formatTime(date)}
        onChange={setDate}
      />
      <Button label="Save task" onPress={() => void save()} loading={saving} />
    </Screen>
  );
}
