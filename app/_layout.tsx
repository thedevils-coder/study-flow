import { Stack } from 'expo-router';
import { AppProvider } from '@/store/app-store';

export default function Layout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
        <Stack.Screen name="admin" />
        <Stack.Screen name="goals" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="ai-meter" />
        <Stack.Screen name="ai-history" />
        <Stack.Screen name="leo" />
        <Stack.Screen name="schedule-maker" />
        <Stack.Screen name="task/new" />
        <Stack.Screen name="task/[id]" />
        <Stack.Screen name="legal" />
      </Stack>
    </AppProvider>
  );
}
