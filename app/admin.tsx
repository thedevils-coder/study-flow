import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { loadAdminStats, type AdminStats } from '@/services/admin';

export default function Admin() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.role !== 'admin') return;
    loadAdminStats()
      .then(setStats)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Admin stats are unavailable.');
      });
  }, [session?.role]);

  if (session?.role !== 'admin') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Screen>
      <ScreenHeader title="Admin" back />
      <Text style={{ color: colors.secondaryText, marginBottom: 16, lineHeight: 20 }}>
        Admin access is granted from the server-side profile role, never from a client flag.
      </Text>
      {!stats && !error ? <LoadingState message="Loading admin stats..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => { setError(null); void loadAdminStats().then(setStats).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Admin stats are unavailable.')); }} /> : null}
      {stats ? (
        <>
          <Card>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Users</Text>
            <Text style={[styles.value, { color: colors.text }]}>{stats.users}</Text>
          </Card>
          <Card>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Active subscriptions</Text>
            <Text style={[styles.value, { color: colors.text }]}>{stats.activeSubscriptions}</Text>
          </Card>
          <Card>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Focus sessions</Text>
            <Text style={[styles.value, { color: colors.text }]}>{stats.focusSessions}</Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '700' },
  value: { fontSize: 28, fontWeight: '900', marginTop: 6 },
});
