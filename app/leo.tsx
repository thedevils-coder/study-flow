import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BRAND } from '@/constants/brand';
import { AccessError, ConfigurationError, userFacingError } from '@/lib/errors';
import { canUseKind } from '@/lib/entitlements';
import { useAuth } from '@/providers/auth-provider';
import { useStudy } from '@/providers/study-provider';
import { useTheme } from '@/providers/theme-provider';
import { aiService } from '@/services/ai';

export default function Leo() {
  const { session, tier } = useAuth();
  const { tasks, goals, progress, reloadAi } = useStudy();
  const { colors } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!session) return;
    if (!canUseKind(tier, 'leo')) {
      router.push('/subscription');
      return;
    }
    setLoading(true);
    try {
      const result = await aiService.generate({
        session,
        kind: 'leo',
        prompt,
        context: {
          tasks: tasks.slice(0, 20).map((task) => ({ title: task.title, scheduledAt: task.scheduledAt, completed: task.completed })),
          goals: goals.slice(0, 10).map((goal) => ({ title: goal.title, current: goal.currentValue, target: goal.targetValue })),
          focusMinutesThisWeek: Math.round(progress.weekSeconds / 60),
        },
      });
      setReply(result.text);
      await reloadAi();
    } catch (error) {
      if (error instanceof AccessError) {
        Alert.alert('Leo', error.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'View plans', onPress: () => router.push('/subscription') },
        ]);
      } else if (error instanceof ConfigurationError) {
        Alert.alert('Leo is not configured', error.message);
      } else {
        Alert.alert('Leo', userFacingError(error, 'Leo could not answer that just now.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={BRAND.assistant} back />
      <View style={styles.hero}>
        <Image source={require('../assets/images/leo-robot.png')} style={styles.robot} />
        <Text style={[styles.title, { color: colors.text }]}>Hi, I’m Leo.</Text>
        <Text style={{ color: colors.secondaryText, textAlign: 'center', lineHeight: 22 }}>
          Your study companion for explanations, revision, planning and motivation. I will not pretend to change tasks unless you ask me to draft a plan.
        </Text>
      </View>
      <Input
        label="Ask Leo"
        value={prompt}
        onChangeText={setPrompt}
        placeholder="Leo, I have three chapters left and two days."
        multiline
        style={{ minHeight: 96, textAlignVertical: 'top' }}
      />
      <Button label="Ask Leo" onPress={() => void ask()} loading={loading} />
      {reply ? (
        <Card style={{ marginTop: 16 }}>
          <Text style={{ color: colors.text, lineHeight: 22 }}>{reply}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: 20, gap: 8 },
  robot: { width: 96, height: 96, resizeMode: 'contain' },
  title: { fontSize: 26, fontWeight: '900' },
});
