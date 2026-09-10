import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { useColors } from '@/lib/use-colors';

export default function TabsLayout() {
  const { session } = useApp();
  const palette = useColors();
  const label = (key: string) => t(session?.language || 'en', key);
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    index: 'home',
    planner: 'calendar',
    focus: 'timer',
    progress: 'bar-chart',
    profile: 'person',
  };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.purple,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabel: label(route.name === 'index' ? 'home' : route.name),
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name]} color={color} size={size} />
        ),
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: palette.background,
          borderTopColor: palette.border,
        },
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="planner" />
      <Tabs.Screen name="focus" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
