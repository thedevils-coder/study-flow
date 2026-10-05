import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { alertDialog } from '@/lib/dialog';
import { userFacingError } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function Recover() {
  const { resetPassword, configured } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      await alertDialog('Reset password', 'Enter the email for your account.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      await alertDialog('Check your email', 'If an account exists, a reset link is on its way.');
    } catch (error) {
      await alertDialog('Reset password', userFacingError(error, 'Unable to send a reset email.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Reset password" back />
      <Text style={[styles.copy, { color: colors.secondaryText }]}>
        We’ll send a reset link to your email. Open it on this device to continue.
      </Text>
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@email.com"
      />
      <Button label="Send reset link" onPress={submit} loading={loading} disabled={!configured} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
});
