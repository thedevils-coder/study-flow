import { useState } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card, ThemedSafeArea } from '@/components/ui';
import { StudyGoal } from '@/services/study-data';
import { useApp } from '@/store/app-store';
import { formatDate, t } from '@/i18n';
import { useColors } from '@/lib/use-colors';

export default function Goals() {
  const {
    session,
    goals,
    addGoal,
    updateGoal,
    updateGoalProgress,
    deleteGoal,
  } = useApp();

  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const language = session?.language || 'en';
  const tr = (key: string) => t(language, key);
  const palette = useColors();
  const inputStyle = [
    s.input,
    { color: palette.ink, borderColor: palette.border, backgroundColor: palette.soft },
  ];

  const resetForm = () => {
    setTitle('');
    setTarget('');
    setDueDate('');
    setEditingId(null);
  };

  const beginEdit = (goal: StudyGoal) => {
    setEditingId(goal.id);
    setTitle(goal.title);
    setTarget(String(goal.targetValue));
    setDueDate(goal.dueAt ? goal.dueAt.slice(0, 10) : '');
  };

  const createGoal = async () => {
    const cleanTitle = title.trim();
    const targetValue = Number(target);

    if (!cleanTitle) {
      Alert.alert(tr('goals'), tr('requiredField'));
      return;
    }

    if (!Number.isInteger(targetValue) || targetValue < 1) {
      Alert.alert(tr('goals'), tr('invalidGoalTarget'));
      return;
    }

    setSaving(true);

    try {
      const dueAt = dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : null;
      if (editingId) {
        await updateGoal(editingId, {
          title: cleanTitle,
          targetValue,
          unit: 'hours',
          dueAt,
        });
      } else {
        await addGoal(cleanTitle, targetValue, 'hours', dueAt);
      }

      resetForm();
    } catch {
      Alert.alert(tr('goals'), tr('unableToSaveGoal'));
    } finally {
      setSaving(false);
    }
  };

  const changeProgress = async (goal: StudyGoal, amount: number) => {
    const nextValue = Math.max(0, goal.currentValue + amount);

    try {
      await updateGoalProgress(goal.id, nextValue);
    } catch {
      Alert.alert(tr('goals'), tr('unableToUpdateGoal'));
    }
  };

  const removeGoal = (goal: StudyGoal) => {
    Alert.alert(tr('deleteGoal'), `${tr('confirmDeleteGoal')} ${goal.title}`, [
      { text: tr('cancel'), style: 'cancel' },
      {
        text: tr('deleteGoal'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGoal(goal.id);
          } catch {
            Alert.alert(tr('goals'), tr('unableToDeleteGoal'));
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
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.header}>
            <Pressable
              onPress={() => router.back()}
              style={[s.backButton, { backgroundColor: palette.soft }]}
              accessibilityRole="button"
              accessibilityLabel={tr('back')}
            >
              <Text style={[s.backText, { color: palette.ink }]}>‹</Text>
            </Pressable>
            <Text style={[s.title, { color: palette.ink }]}>{tr('goals')}</Text>
            <View style={s.headerSpacer} />
          </View>

          <Text style={[s.subtitle, { color: palette.muted }]}>{tr('goalsSubtitle')}</Text>

          <Card style={s.createCard}>
            <Text style={[s.sectionTitle, { color: palette.ink }]}>
              {editingId ? tr('editGoal') : tr('createGoal')}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={tr('goalName')}
              placeholderTextColor={palette.muted}
              style={inputStyle}
              maxLength={160}
            />
            <TextInput
              value={target}
              onChangeText={setTarget}
              placeholder={tr('target')}
              placeholderTextColor={palette.muted}
              style={inputStyle}
              keyboardType="number-pad"
            />
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder={`${tr('dueDate')} (${tr('dueDateHint')})`}
              placeholderTextColor={palette.muted}
              style={inputStyle}
            />
            <Pressable
              onPress={createGoal}
              disabled={saving}
              style={[s.primaryButton, { backgroundColor: palette.purple }, saving && s.buttonDisabled]}
            >
              <Text style={s.primaryButtonText}>
                {saving ? tr('saving') : editingId ? tr('saveGoal') : tr('addGoal')}
              </Text>
            </Pressable>
            {editingId ? (
              <Pressable onPress={resetForm} style={s.secondaryButton}>
                <Text style={[s.secondaryButtonText, { color: palette.purple }]}>{tr('cancelEdit')}</Text>
              </Pressable>
            ) : null}
          </Card>

          <Text style={[s.sectionHeading, { color: palette.ink }]}>{tr('yourGoals')}</Text>

          {goals.length === 0 ? (
            <Card style={s.emptyCard}>
              <Text style={[s.emptyTitle, { color: palette.ink }]}>{tr('noGoalsYet')}</Text>
              <Text style={[s.emptyText, { color: palette.muted }]}>{tr('createFirstGoal')}</Text>
            </Card>
          ) : (
            goals.map((goal) => {
              const percentage =
                goal.targetValue > 0
                  ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
                  : 0;

              return (
                <Card key={goal.id} style={s.goalCard}>
                  <View style={s.goalHeader}>
                    <View style={s.goalTitleWrap}>
                      <Text style={[s.goalTitle, { color: palette.ink }]}>{goal.title}</Text>
                      <Text style={[s.goalValue, { color: palette.muted }]}>
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                        {goal.dueAt ? ` · ${formatDate(language, goal.dueAt)}` : ''}
                      </Text>
                    </View>
                    <View style={s.goalActions}>
                      <Pressable onPress={() => beginEdit(goal)} hitSlop={10}>
                        <Text style={[s.editText, { color: palette.purple }]}>{tr('editGoal')}</Text>
                      </Pressable>
                      <Pressable onPress={() => removeGoal(goal)} hitSlop={10}>
                        <Text style={[s.deleteText, { color: palette.danger }]}>{tr('deleteGoal')}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={[s.progressTrack, { backgroundColor: palette.soft }]}>
                    <View
                      style={[s.progressFill, { width: `${percentage}%`, backgroundColor: palette.purple }]}
                    />
                  </View>
                  <Text style={[s.percentText, { color: palette.muted }]}>
                    {percentage}% {tr('percentComplete')}
                    {goal.dueAt &&
                    new Date(goal.dueAt) < new Date() &&
                    goal.currentValue < goal.targetValue
                      ? ` · ${tr('overdueGoal')}`
                      : ''}
                  </Text>
                  <View style={s.controls}>
                    {[-1, 1, 5].map((amount) => (
                      <Pressable
                        key={amount}
                        onPress={() => changeProgress(goal, amount)}
                        style={[s.controlButton, { backgroundColor: palette.soft }]}
                      >
                        <Text style={[s.controlText, { color: palette.purple }]}>
                          {amount > 0 ? `+${amount}` : amount}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: { fontSize: 30, lineHeight: 32 },
  headerSpacer: { width: 40 },
  title: { fontSize: 26, fontWeight: '900' },
  subtitle: { fontSize: 14, marginBottom: 18 },
  createCard: { marginBottom: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 10,
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: 'white', fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '800' },
  sectionHeading: { fontSize: 20, fontWeight: '900', marginBottom: 12 },
  emptyCard: { alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { fontSize: 17, fontWeight: '900', marginBottom: 6 },
  emptyText: { fontSize: 14 },
  goalCard: { marginBottom: 12 },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  goalTitleWrap: { flex: 1 },
  goalActions: { alignItems: 'flex-end', gap: 6 },
  goalTitle: { fontSize: 17, fontWeight: '900' },
  goalValue: { fontSize: 13, marginTop: 4 },
  deleteText: { fontSize: 13, fontWeight: '800' },
  editText: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 16 },
  progressFill: { height: '100%', borderRadius: 5 },
  percentText: { fontSize: 12, marginTop: 7 },
  controls: { flexDirection: 'row', gap: 8, marginTop: 14 },
  controlButton: {
    minWidth: 58,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: { fontWeight: '900', fontSize: 14 },
});
