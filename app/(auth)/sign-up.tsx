import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { userFacingError } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function SignUp() {
  const { signUp, signInWithGoogle, configured } = useAuth();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 8) {
      Alert.alert('Create account', 'Use a valid email and a password of at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const result = await signUp(email, password, name || 'Student');
      if (result.needsVerification) {
        Alert.alert('Check your email', 'Confirm your email to finish creating your account, then sign in.');
        router.replace('/(auth)/sign-in');
        return;
      }
      router.replace('/');
    } catch (error) {
      Alert.alert('Create account', userFacingError(error, 'Unable to create your account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Create account" back />
      <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@email.com"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="At least 8 characters"
      />
      <Button label="Create account" onPress={submit} loading={loading} disabled={!configured} />
      <Button
        label="Continue with Google"
        variant="secondary"
        onPress={async () => {
          setLoading(true);
          try {
            const result = await signInWithGoogle();
            if (!result.cancelled) router.replace('/');
          } catch (error) {
            Alert.alert('Google sign-in', userFacingError(error, 'Google sign-in is not available yet.'));
          } finally {
            setLoading(false);
          }
        }}
        disabled={!configured || loading}
        style={{ marginTop: 12 }}
      />
      <Pressable onPress={() => router.push('/(auth)/sign-in')} style={styles.linkWrap}>
        <Text style={{ color: colors.secondaryText, fontWeight: '600' }}>Already have an account? Sign in</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  linkWrap: { alignItems: 'center', marginTop: 18 },
});
