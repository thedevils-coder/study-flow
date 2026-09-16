import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TestStateNotice } from '@/components/TestStateNotice';
import { AccessError, ConfigurationError, userFacingError } from '@/lib/errors';
import { canUseKind } from '@/lib/entitlements';
import { TESTER_COPY, isTesterBuildEnabled, isTesterSession } from '@/lib/tester';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { aiService } from '@/services/ai';
import type { ProposedTask, ScheduleDraft } from '@/types';

export default function ScheduleMaker() {
  const { session, tier } = useAuth();
  const { createTask, reloadAi } = useStudy();
  const { colors } = useTheme();
  const [subjects, setSubjects] = useState('');
  const [examDate, setExamDate] = useState('');
  const [hours, setHours] = useState('');
  const [priorities, setPriorities] = useState('');
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    if (!session) return;
    if (!canUseKind(tier, 'schedule')) {
      router.push('/subscription');
      return;
    }
    const prompt = [
      `Create a realistic study schedule.`,
      subjects && `Subjects/tasks: ${subjects}`,
      examDate && `Exam or due date: ${examDate}`,
      hours && `Available hours: ${hours}`,
      priorities && `Priorities: ${priorities}`,
      'Return a JSON array of {title, scheduledAt, minutes, reason} using ISO datetimes. Do not overwrite existing work.',
    ]
      .filter(Boolean)
      .join('\n');

    setLoading(true);
    try {
      const result = await aiService.generate({ session, kind: 'schedule', prompt });
      const parsed = aiService.parseSchedule(result.text);
      setDraft(parsed);
      setSelected(Object.fromEntries(parsed.tasks.map((_, index) => [index, true])));
      await reloadAi();
    } catch (error) {
      if (error instanceof AccessError) {
        Alert.alert('AI Schedule Maker', error.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'View plans', onPress: () => router.push('/subscription') },
        ]);
      } else if (error instanceof ConfigurationError) {
        Alert.alert('AI is not configured', error.message);
      } else {
        Alert.alert('Schedule Maker', userFacingError(error, 'Unable to generate a schedule.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    if (!draft || !session) return;
    const chosen = draft.tasks.filter((_, index) => selected[index]);
    if (chosen.length === 0) {
      Alert.alert('Schedule Maker', 'Select at least one proposed task, or reject the draft.');
      return;
    }
    setSaving(true);
    try {
      for (const task of chosen as ProposedTask[]) {
        await createTask(task.title, new Date(task.scheduledAt));
      }
      Alert.alert('Schedule saved', `${chosen.length} task${chosen.length === 1 ? '' : 's'} added to your planner.`);
      router.push('/(tabs)/plan');
    } catch (error) {
      Alert.alert('Schedule Maker', userFacingError(error, 'Unable to save those tasks.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="AI Schedule Maker" back />
      {isTesterBuildEnabled() && isTesterSession(session) ? (
        <TestStateNotice message={TESTER_COPY.ai} />
      ) : null}
      <Text style={{ color: colors.secondaryText, marginBottom: 16, lineHeight: 22 }}>
        Preview the plan before anything is added. Existing tasks are never overwritten automatically.
      </Text>
      <Input label="Subjects or tasks" value={subjects} onChangeText={setSubjects} placeholder="Physics, Chemistry, essay" />
      <Input label="Exam or due date" value={examDate} onChangeText={setExamDate} placeholder="20 October" />
      <Input label="Available hours" value={hours} onChangeText={setHours} placeholder="2 hours after school" />
      <Input label="Priorities" value={priorities} onChangeText={setPriorities} placeholder="Finish chapter 5 first" />
      <Button label="Generate preview" onPress={() => void generate()} loading={loading} />

      {draft ? (
        <View style={{ marginTop: 20 }}>
          {draft.notes ? <Text style={{ color: colors.secondaryText, marginBottom: 12 }}>{draft.notes}</Text> : null}
          {draft.tasks.length === 0 ? (
            <Card>
              <Text style={{ color: colors.text }}>Leo returned a plan, but no structured tasks could be previewed. Nothing was added.</Text>
            </Card>
          ) : (
            draft.tasks.map((task, index) => (
              <Card key={`${task.title}-${index}`}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{task.title}</Text>
                <Text style={{ color: colors.secondaryText, marginTop: 4 }}>
                  {new Date(task.scheduledAt).toLocaleString()}
                  {task.minutes ? ` · ${task.minutes} min` : ''}
                </Text>
                {task.reason ? <Text style={{ color: colors.mutedText, marginTop: 6 }}>{task.reason}</Text> : null}
                <Button
                  label={selected[index] ? 'Selected' : 'Skipped'}
                  variant={selected[index] ? 'secondary' : 'ghost'}
                  onPress={() => setSelected((current) => ({ ...current, [index]: !current[index] }))}
                  style={{ marginTop: 10 }}
                />
              </Card>
            ))
          )}
          <Button label="Accept selected tasks" onPress={() => void accept()} loading={saving} />
          <Button label="Reject plan" variant="ghost" onPress={() => setDraft(null)} style={{ marginTop: 10 }} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  itemTitle: { fontWeight: '800', fontSize: 16 },
});
