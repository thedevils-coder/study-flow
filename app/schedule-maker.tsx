import { useState } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card, EmptyState, ThemedSafeArea } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { formatDateTime, t } from '@/i18n';
import { useColors } from '@/lib/use-colors';
import { aiErrorCopyKey, generateAi } from '@/services/ai';
import { getTier, canUseKind } from '@/lib/entitlements';

type Suggestion = {
  title: string;
  scheduledAt: string;
  minutes?: number;
  reason?: string;
  selected: boolean;
};

const parseSuggestions = (text: string): Suggestion[] => {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    return [];
  }
  try {
    const rows = JSON.parse(match[0]) as Record<string, unknown>[];
    return rows
      .map((row) => ({
        title: String(row.title || '').trim(),
        scheduledAt: String(row.scheduledAt || row.scheduled_at || ''),
        minutes: Number(row.minutes) || 45,
        reason: row.reason ? String(row.reason) : undefined,
        selected: true,
      }))
      .filter((row) => row.title && row.scheduledAt);
  } catch {
    return [];
  }
};

export default function ScheduleMaker() {
  const { session, settings, tasks, goals, addTask } = useApp();
  const [subjects, setSubjects] = useState('');
  const [availableTime, setAvailableTime] = useState('');
  const [timetable, setTimetable] = useState('');
  const [deadlines, setDeadlines] = useState('');
  const [preferredPeriods, setPreferredPeriods] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const tr = (key: string) => t(session!.language, key);
  const palette = useColors();
  const language = session!.language;
  const tier = getTier(session);

  const generate = async () => {
    if (!canUseKind(tier, 'schedule')) {
      router.push('/subscription');
      return;
    }
    setBusy(true);
    try {
      const existing = tasks
        .filter((task) => task.scheduledAt)
        .map((task) => `${task.title} @ ${task.scheduledAt}`)
        .join('; ');
      const response = await generateAi({
        kind: 'schedule',
        prompt: `Create a realistic study schedule. Subjects: ${subjects || 'not specified'}. Available time: ${availableTime || 'not specified'}. Timetable/busy times: ${timetable || 'not specified'}. Deadlines: ${deadlines || 'not specified'}. Preferred study periods: ${preferredPeriods || 'not specified'}. Existing tasks: ${existing || 'none'}. Goals: ${goals.map((goal) => `${goal.title}${goal.dueAt ? ` due ${goal.dueAt}` : ''}`).join(', ') || 'none'}. Return JSON only.`,
        context: settings.aiContextEnabled
          ? {
              tasks: tasks.map((task) => ({
                title: task.title,
                scheduledAt: task.scheduledAt,
                done: task.done,
              })),
              goals: goals.map((goal) => ({
                title: goal.title,
                currentValue: goal.currentValue,
                targetValue: goal.targetValue,
                dueAt: goal.dueAt,
              })),
            }
          : undefined,
      });
      const next = parseSuggestions(response.text);
      setSuggestions(next);
      if (next.length === 0) {
        Alert.alert(tr('studySchedule'), response.text || tr('scheduleEmpty'));
      }
    } catch (error) {
      Alert.alert(tr('studySchedule'), tr(aiErrorCopyKey(error)));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    const chosen = suggestions.filter((item) => item.selected);
    const existingTimes = new Set(tasks.map((task) => task.scheduledAt).filter(Boolean));
    let added = 0;
    for (const item of chosen) {
      if (existingTimes.has(item.scheduledAt)) {
        continue;
      }
      await addTask(item.title, item.scheduledAt, 'study');
      added += 1;
    }
    Alert.alert(tr('studySchedule'), added ? tr('scheduleApplied') : tr('scheduleConflict'));
    if (added) {
      router.push('/(tabs)/planner');
    }
  };

  return (
    <ThemedSafeArea>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()}>
          <Text style={[s.back, { color: palette.purple }]}>{tr('back')}</Text>
        </Pressable>
        <Text style={[s.title, { color: palette.ink }]}>{tr('studySchedule')}</Text>
        <Text style={[s.body, { color: palette.muted }]}>{tr('scheduleIntro')}</Text>
        <Text style={[s.note, { color: palette.ink }]}>{tr('noOverwrite')}</Text>
        <Text style={[s.label, { color: palette.ink }]}>{tr('subjects')}</Text>
        <TextInput
          value={subjects}
          onChangeText={setSubjects}
          placeholder={tr('subjects')}
          placeholderTextColor={palette.muted}
          style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
        />
        <Text style={[s.label, { color: palette.ink }]}>{tr('availableTime')}</Text>
        <TextInput
          value={availableTime}
          onChangeText={setAvailableTime}
          placeholder={tr('availableTimeHint')}
          placeholderTextColor={palette.muted}
          style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
        />
        <Text style={[s.label, { color: palette.ink }]}>{tr('timetable')}</Text>
        <TextInput
          value={timetable}
          onChangeText={setTimetable}
          placeholder={tr('timetableHint')}
          placeholderTextColor={palette.muted}
          style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
        />
        <Text style={[s.label, { color: palette.ink }]}>{tr('deadlines')}</Text>
        <TextInput
          value={deadlines}
          onChangeText={setDeadlines}
          placeholder={tr('dueDateHint')}
          placeholderTextColor={palette.muted}
          style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
        />
        <Text style={[s.label, { color: palette.ink }]}>{tr('preferredPeriods')}</Text>
        <TextInput
          value={preferredPeriods}
          onChangeText={setPreferredPeriods}
          placeholder={tr('availableTimeHint')}
          placeholderTextColor={palette.muted}
          style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
        />
        <Button label={tr('generateSchedule')} onPress={generate} loading={busy} />
        <Text style={[s.section, { color: palette.ink }]}>{tr('reviewSchedule')}</Text>
        {suggestions.length === 0 ? (
          <EmptyState title={tr('scheduleEmpty')} />
        ) : (
          suggestions.map((item, index) => (
            <Card key={`${item.scheduledAt}-${index}`}>
              <Pressable
                onPress={() =>
                  setSuggestions((list) =>
                    list.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, selected: !row.selected } : row,
                    ),
                  )
                }
              >
                <Text style={[s.itemTitle, { color: palette.ink }]}>
                  {item.selected ? '☑' : '☐'} {item.title}
                </Text>
                <Text style={[s.muted, { color: palette.muted }]}>{formatDateTime(language, item.scheduledAt)}</Text>
                {item.reason ? <Text style={[s.muted, { color: palette.muted }]}>{item.reason}</Text> : null}
              </Pressable>
            </Card>
          ))
        )}
        {suggestions.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Button label={tr('applySchedule')} onPress={apply} />
            <Button label={tr('rejectSchedule')} variant="light" onPress={() => setSuggestions([])} />
          </View>
        ) : null}
      </ScrollView>
    </ThemedSafeArea>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40, gap: 8 },
  back: { fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '900' },
  body: { lineHeight: 20 },
  note: { fontWeight: '700' },
  label: { fontWeight: '800', marginTop: 8 },
  input: { borderRadius: 14, padding: 14 },
  section: { fontWeight: '900', fontSize: 18, marginTop: 12 },
  itemTitle: { fontWeight: '800' },
  muted: { marginTop: 4 },
});
