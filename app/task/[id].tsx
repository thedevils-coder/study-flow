import { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, ThemedSafeArea } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { formatDate, formatTime, t } from '@/i18n';
import { useColors } from '@/lib/use-colors';
import { TaskCategory } from '@/types';
import { combineDateAndTime } from '@/lib/dates';

export default function TaskEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session, tasks, addTask, updateTask, deleteTask } = useApp();
  const existing = tasks.find((task) => task.id === id);
  const tr = (key: string) => t(session?.language || 'en', key);
  const palette = useColors();

  const initial = existing?.scheduledAt ? new Date(existing.scheduledAt) : new Date();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(initial);
  const [category, setCategory] = useState<TaskCategory>(existing?.category ?? 'study');
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [busy, setBusy] = useState(false);

  const categories: TaskCategory[] = useMemo(() => ['study', 'focus', 'break'], []);

  const save = async () => {
    const clean = title.trim();
    if (!clean) {
      Alert.alert(tr('addTask'), tr('requiredField'));
      return;
    }

    setBusy(true);
    try {
      const scheduledAt = combineDateAndTime(date, date.getHours(), date.getMinutes()).toISOString();
      if (existing) {
        await updateTask(existing.id, { title: clean, scheduledAt, category });
      } else {
        await addTask(clean, scheduledAt, category);
      }
      router.back();
    } catch {
      Alert.alert(tr('addTask'), tr('unableToSaveTask'));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!existing) {
      return;
    }

    Alert.alert(tr('deleteTask'), tr('confirmDelete'), [
      { text: tr('cancel'), style: 'cancel' },
      {
        text: tr('deleteTask'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(existing.id);
            router.back();
          } catch {
            Alert.alert(tr('deleteTask'), tr('unableToDeleteTask'));
          }
        },
      },
    ]);
  };

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={[s.back, { color: palette.purple }]}>{tr('back')}</Text>
          </Pressable>
          <Text style={[s.title, { color: palette.ink }]}>{existing ? tr('editTask') : tr('addTask')}</Text>

          <Text style={[s.label, { color: palette.ink }]}>{tr('taskTitle')}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={tr('taskTitle')}
            placeholderTextColor={palette.muted}
            style={[s.input, { backgroundColor: palette.soft, color: palette.ink }]}
            maxLength={160}
          />

          <Text style={[s.label, { color: palette.ink }]}>{tr('date')}</Text>
          <Pressable style={[s.input, { backgroundColor: palette.soft }]} onPress={() => setPicker('date')}>
            <Text style={[s.value, { color: palette.ink }]}>{formatDate(session?.language || 'en', date)}</Text>
          </Pressable>

          <Text style={[s.label, { color: palette.ink }]}>{tr('time')}</Text>
          <Pressable style={[s.input, { backgroundColor: palette.soft }]} onPress={() => setPicker('time')}>
            <Text style={[s.value, { color: palette.ink }]}>
              {formatTime(session?.language || 'en', date)}
            </Text>
          </Pressable>

          {picker && (
            <DateTimePicker
              value={date}
              mode={picker}
              onChange={(_, next) => {
                if (Platform.OS !== 'ios') {
                  setPicker(null);
                }
                if (next) {
                  setDate(next);
                }
              }}
            />
          )}

          <Text style={[s.label, { color: palette.ink }]}>{tr('category')}</Text>
          <View style={s.row}>
            {categories.map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[s.chip, { backgroundColor: palette.soft }, category === item && { backgroundColor: palette.purple }]}
              >
                <Text style={[s.chipText, { color: palette.muted }, category === item && s.chipTextOn]}>{tr(item)}</Text>
              </Pressable>
            ))}
          </View>

          <Button label={tr('saveTask')} onPress={save} loading={busy} />
          {existing ? (
            <Button label={tr('deleteTask')} variant="danger" onPress={remove} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40, gap: 10 },
  back: { fontWeight: '800', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
  label: { fontWeight: '800', marginTop: 8 },
  input: {
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
  },
  value: { fontSize: 16 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  chipText: { fontWeight: '800' },
  chipTextOn: { color: 'white' },
});
