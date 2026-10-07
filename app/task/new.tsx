import { useState } from 'react';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { PlatformDateTimePicker } from '@/components/PlatformDateTimePicker';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { showInterstitialAd } from '@/lib/ads';
import { formatDate, formatTime } from '@/lib/dates';
import { alertDialog } from '@/lib/dialog';
import { userFacingError } from '@/lib/errors';
import { goBackOrHome } from '@/lib/navigation';
import { webDebug } from '@/lib/web-debug';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';

export default function NewTask() {
  const { session, tier } = useAuth();
  const { createTask } = useStudy();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const save = async () => {
    webDebug('Add Task pressed');
    setSaving(true);
    try {
      const saved = await createTask(title, date);
      void showInterstitialAd({ session, tier, reason: 'task_save', token: saved.id });
      goBackOrHome();
    } catch (error) {
      await alertDialog('Task', userFacingError(error, 'Unable to save the task.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="New task" back />
      <Input label="Title" value={title} onChangeText={setTitle} placeholder="Read chapter 4" />
      <PlatformDateTimePicker
        label="Date"
        mode="date"
        value={date}
        displayText={formatDate(date)}
        onChange={setDate}
      />
      <PlatformDateTimePicker
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
