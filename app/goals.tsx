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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui';
import { colors } from '@/constants/theme';
import { StudyGoal } from '@/services/study-data';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';

export default function Goals() {
  const {
    session,
    goals,
    addGoal,
    updateGoalProgress,
    deleteGoal,
  } = useApp();

  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const tr = (key: string) => t(session?.language || 'en', key);

  const createGoal = async () => {
    const cleanTitle = title.trim();
    const targetValue = Number(target);

    if (!cleanTitle) {
      Alert.alert(tr('goals'), tr('requiredField'));
      return;
    }

    if (
      !Number.isInteger(targetValue) ||
      targetValue < 1
    ) {
      Alert.alert(
        tr('goals'),
        tr('requiredField'),
      );
      return;
    }

    setSaving(true);

    try {
      const dueAt = dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : null;
      await addGoal(
        cleanTitle,
        targetValue,
        'hours',
        dueAt,
      );

      setTitle('');
      setTarget('');
      setDueDate('');
    } catch {
      Alert.alert(
        tr('goals'),
        tr('unableToSaveGoal'),
      );
    } finally {
      setSaving(false);
    }
  };

  const changeProgress = async (
    goal: StudyGoal,
    amount: number,
  ) => {
    const nextValue = Math.max(
      0,
      goal.currentValue + amount,
    );

    try {
      await updateGoalProgress(
        goal.id,
        nextValue,
      );
    } catch {
      Alert.alert(
        tr('goals'),
        tr('unableToUpdateGoal'),
      );
    }
  };

  const removeGoal = (goal: StudyGoal) => {
    Alert.alert(
      tr('deleteGoal'),
      `${tr('confirmDeleteGoal')} ${goal.title}`,
      [
        {
          text: tr('cancel'),
          style: 'cancel',
        },
        {
          text: tr('deleteTask'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(goal.id);
            } catch {
              Alert.alert(
                tr('goals'),
                tr('unableToDeleteGoal'),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.page}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={s.backButton}
          >
            <Text style={s.backText}>‹</Text>
          </Pressable>

          <Text style={s.title}>{tr('goals')}</Text>

          <View style={s.headerSpacer} />
        </View>

        <Text style={s.subtitle}>
          {tr('goalsSubtitle')}
        </Text>

        <Card style={s.createCard}>
          <Text style={s.sectionTitle}>
            {tr('createGoal')}
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={tr('goalName')}
            placeholderTextColor={colors.muted}
            style={s.input}
            maxLength={160}
          />

          <TextInput
            value={target}
            onChangeText={setTarget}
            placeholder={tr('target')}
            placeholderTextColor={colors.muted}
            style={s.input}
            keyboardType="number-pad"
          />

          <TextInput
            value={dueDate}
            onChangeText={setDueDate}
            placeholder={`${tr('dueDate')} (YYYY-MM-DD)`}
            placeholderTextColor={colors.muted}
            style={s.input}
          />

          <Pressable
            onPress={createGoal}
            disabled={saving}
            style={[
              s.primaryButton,
              saving && s.buttonDisabled,
            ]}
          >
            <Text style={s.primaryButtonText}>
              {saving ? tr('saving') : tr('addGoal')}
            </Text>
          </Pressable>
        </Card>

        <Text style={s.sectionHeading}>
          {tr('yourGoals')}
        </Text>

        {goals.length === 0 ? (
          <Card style={s.emptyCard}>
            <Text style={s.emptyTitle}>
              {tr('noGoalsYet')}
            </Text>

            <Text style={s.emptyText}>
              {tr('createFirstGoal')}
            </Text>
          </Card>
        ) : (
          goals.map(goal => {
            const percentage =
              goal.targetValue > 0
                ? Math.min(
                    100,
                    Math.round(
                      (goal.currentValue /
                        goal.targetValue) *
                        100,
                    ),
                  )
                : 0;

            return (
              <Card
                key={goal.id}
                style={s.goalCard}
              >
                <View style={s.goalHeader}>
                  <View style={s.goalTitleWrap}>
                    <Text style={s.goalTitle}>
                      {goal.title}
                    </Text>

                    <Text style={s.goalValue}>
                      {goal.currentValue} /{' '}
                      {goal.targetValue} {goal.unit}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      removeGoal(goal)
                    }
                    hitSlop={10}
                  >
                    <Text style={s.deleteText}>
                      {tr('deleteTask')}
                    </Text>
                  </Pressable>
                </View>

                <View style={s.progressTrack}>
                  <View
                    style={[
                      s.progressFill,
                      {
                        width: `${percentage}%`,
                      },
                    ]}
                  />
                </View>

                <Text style={s.percentText}>
                  {percentage}% {tr('percentComplete')}
                  {goal.dueAt && new Date(goal.dueAt) < new Date() && goal.currentValue < goal.targetValue
                    ? ` · ${tr('overdueGoal')}`
                    : ''}
                </Text>

                <View style={s.controls}>
                  <Pressable
                    onPress={() =>
                      changeProgress(goal, -1)
                    }
                    style={s.controlButton}
                  >
                    <Text style={s.controlText}>
                      −1
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      changeProgress(goal, 1)
                    }
                    style={s.controlButton}
                  >
                    <Text style={s.controlText}>
                      +1
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      changeProgress(goal, 5)
                    }
                    style={s.controlButton}
                  >
                    <Text style={s.controlText}>
                      +5
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: 'white',
  },

  scroll: {
    padding: 20,
    paddingBottom: 40,
  },

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
    backgroundColor: '#F4F2F8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backText: {
    fontSize: 30,
    lineHeight: 32,
    color: colors.ink,
  },

  headerSpacer: {
    width: 40,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.ink,
  },

  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 18,
  },

  createCard: {
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 12,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E4E1EA',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 10,
    backgroundColor: '#FAFAFC',
  },

  primaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
  },

  sectionHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 12,
  },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 6,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },

  goalCard: {
    marginBottom: 12,
  },

  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  goalTitleWrap: {
    flex: 1,
  },

  goalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.ink,
  },

  goalValue: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },

  deleteText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '800',
  },

  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ECEAF1',
    overflow: 'hidden',
    marginTop: 16,
  },

  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.purple,
  },

  percentText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 7,
  },

  controls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  controlButton: {
    minWidth: 58,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: '#F3F0F8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  controlText: {
    color: colors.purple,
    fontWeight: '900',
    fontSize: 14,
  },
});