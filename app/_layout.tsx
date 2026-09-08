import { Stack } from 'expo-router';
import { AppProvider } from '@/store/app-store';

export default function Layout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="subscription"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="admin" />
        <Stack.Screen name="goals" />
      </Stack>
    </AppProvider>
  );
}