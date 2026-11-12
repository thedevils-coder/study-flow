import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { GoalCard } from '@/components/GoalCard';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatShortDate } from '@/lib/dates';
import { userFacingError } from '@/lib/errors';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';

export default function Goals() {
  const { goals, createGoal, updateGoal, deleteGoal } = useStudy();
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('hours');
  const [due, setDue] = useState<Date | null>(null);
  const [showDue, setShowDue] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await createGoal(title, target, unit, due);
      setTitle('');
      setTarget('');
      setDue(null);
    } catch (error) {
      Alert.alert('Goal', userFacingError(error, 'Unable to save the goal.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Goals" back />
      <Card>
        <Text style={[styles.heading, { color: colors.text }]}>Create a goal</Text>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="Study 20 hours this month" />
        <Input label="Target" value={target} onChangeText={setTarget} keyboardType="number-pad" placeholder="20" />
        <Input label="Unit" value={unit} onChangeText={setUnit} placeholder="hours" />
        <Pressable onPress={() => setShowDue(true)} style={[styles.field, { borderColor: colors.inputBorder, backgroundColor: colors.input }]}>
          <Text style={{ color: colors.mutedText, fontWeight: '700' }}>Due date</Text>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{due ? formatShortDate(due) : 'Optional'}</Text>
        </Pressable>
        {showDue ? (
          <DateTimePicker
            value={due ?? new Date()}
            mode="date"
            onChange={(_, selected) => {
              setShowDue(Platform.OS === 'ios');
              if (selected) setDue(selected);
            }}
          />
        ) : null}
        <Button label="Add goal" onPress={() => void save()} loading={saving} />
      </Card>

      {goals.length === 0 ? (
        <EmptyState
          icon="flag-outline"
          title="No goals yet"
          message="Create a study goal and track your progress."
        />
      ) : (
        goals.map((goal) => (
          <View key={goal.id}>
            <GoalCard goal={goal} />
            <View style={styles.controls}>
              <Button label="-1" variant="ghost" onPress={() => void updateGoal(goal.id, { currentValue: Math.max(0, goal.currentValue - 1) })} />
              <Button label="+1" variant="ghost" onPress={() => void updateGoal(goal.id, { currentValue: goal.currentValue + 1 })} />
              <Button
                label="Delete"
                variant="danger"
                onPress={() =>
                  Alert.alert('Delete goal', `Delete “${goal.title}”?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => void deleteGoal(goal.id) },
                  ])
                }
              />
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
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
  controls: { flexDirection: 'row', gap: 8, marginBottom: 16 },
});
