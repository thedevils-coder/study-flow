import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { GoalCard } from '@/components/GoalCard';
import { Input } from '@/components/Input';
import { PlatformDateTimePicker } from '@/components/PlatformDateTimePicker';
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
        <PlatformDateTimePicker
          label="Due date"
          mode="date"
          value={due}
          displayText={due ? formatShortDate(due) : ''}
          placeholder="Optional"
          onChange={setDue}
        />
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
  controls: { flexDirection: 'row', gap: 8, marginBottom: 16 },
});
