import { Stack } from 'expo-router';
import { type ReactNode } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { AppProvider } from '@/store/app-store';
import { useColors, useResolvedTheme } from '@/lib/use-colors';

WebBrowser.maybeCompleteAuthSession();

function ThemedRoot({ children }: { children: ReactNode }) {
  const theme = useResolvedTheme();
  const palette = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  );
}

export default function Layout() {
  return (
    <AppProvider>
      <ThemedRoot>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
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
      </ThemedRoot>
    </AppProvider>
  );
}
