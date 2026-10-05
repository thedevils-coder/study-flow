import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { TestStateNotice } from '@/components/TestStateNotice';
import { isSupabaseConfigured } from '@/lib/config';
import { alertDialog } from '@/lib/dialog';
import { userFacingError } from '@/lib/errors';
import { TESTER_COPY, isTesterBuildEnabled } from '@/lib/tester';
import { useAuth } from '@/providers/auth-provider';

export function TesterAccountButton() {
  const { signInTester, configured } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isTesterBuildEnabled()) return null;

  const openTester = async () => {
    setLoading(true);
    try {
      await signInTester();
      router.replace('/');
    } catch (error) {
      await alertDialog(
        'Tester / Demo Account',
        userFacingError(error, 'Unable to open the tester profile.'),
      );
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Tester / Demo Account failed', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TestStateNotice
        title="Preview and development only"
        message={
          !configured || !isSupabaseConfigured
            ? 'Supabase is not configured on this device. Add the public project URL and publishable key, then use Tester / Demo Account.'
            : 'Opens the real tester account in this project, then loads sample study data. Production sign-in is unchanged.'
        }
      />
      <Button
        label={TESTER_COPY.button}
        variant="ghost"
        onPress={() => void openTester()}
        loading={loading}
        disabled={!configured}
      />
    </View>
  );
}
