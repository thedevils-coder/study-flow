import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TesterAccountButton } from '@/components/TesterAccountButton';
import { userFacingError } from '@/lib/errors';
import { isTesterBuildEnabled } from '@/lib/tester';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function SignIn() {
  const { signIn, signInWithGoogle, configured } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Sign in', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (error) {
      Alert.alert('Sign in', userFacingError(error, 'Unable to sign in.'));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.cancelled) router.replace('/');
    } catch (error) {
      Alert.alert('Google sign-in', userFacingError(error, 'Google sign-in is not available yet.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Sign in" back />
      {!configured ? (
        <Text style={[styles.note, { color: colors.warning }]}>
          Supabase is not configured on this device. Add the public project URL and publishable key to continue.
        </Text>
      ) : null}
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
        placeholder="Password"
      />
      <Button label="Sign in" onPress={submit} loading={loading} disabled={!configured} />
      <View style={{ height: 12 }} />
      <Button label="Continue with Google" variant="secondary" onPress={google} disabled={!configured || loading} />
      <Pressable onPress={() => router.push('/(auth)/recover')} style={styles.linkWrap}>
        <Text style={[styles.link, { color: colors.accent }]}>Forgot password?</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(auth)/sign-up')} style={styles.linkWrap}>
        <Text style={[styles.note, { color: colors.secondaryText }]}>Need an account? Create one</Text>
      </Pressable>
      {isTesterBuildEnabled() ? (
        <View style={{ marginTop: 24 }}>
          <TesterAccountButton />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  linkWrap: { alignItems: 'center', marginTop: 16 },
  link: { fontWeight: '800' },
});
