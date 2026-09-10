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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { TaskCategory } from '@/types';
import { combineDateAndTime } from '@/lib/dates';

export default function TaskEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session, tasks, addTask, updateTask, deleteTask } = useApp();
  const existing = tasks.find((task) => task.id === id);
  const tr = (key: string) => t(session?.language || 'en', key);

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
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={s.back}>{tr('back')}</Text>
          </Pressable>
          <Text style={s.title}>{existing ? tr('editTask') : tr('addTask')}</Text>

          <Text style={s.label}>{tr('taskTitle')}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={tr('taskTitle')}
            placeholderTextColor={colors.muted}
            style={s.input}
            maxLength={160}
          />

          <Text style={s.label}>{tr('date')}</Text>
          <Pressable style={s.input} onPress={() => setPicker('date')}>
            <Text style={s.value}>{date.toLocaleDateString()}</Text>
          </Pressable>

          <Text style={s.label}>{tr('time')}</Text>
          <Pressable style={s.input} onPress={() => setPicker('time')}>
            <Text style={s.value}>
              {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
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

          <Text style={s.label}>{tr('category')}</Text>
          <View style={s.row}>
            {categories.map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[s.chip, category === item && s.chipOn]}
              >
                <Text style={[s.chipText, category === item && s.chipTextOn]}>{tr(item)}</Text>
              </Pressable>
            ))}
          </View>

          <Button label={tr('saveTask')} onPress={save} loading={busy} />
          {existing ? (
            <Button label={tr('deleteTask')} variant="danger" onPress={remove} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: 20, paddingBottom: 40, gap: 10 },
  back: { color: colors.purple, fontWeight: '800', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink, marginBottom: 8 },
  label: { fontWeight: '800', color: colors.ink, marginTop: 8 },
  input: {
    backgroundColor: colors.soft,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: colors.ink,
  },
  value: { fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.soft,
  },
  chipOn: { backgroundColor: colors.purple },
  chipText: { fontWeight: '800', color: colors.muted },
  chipTextOn: { color: 'white' },
});
