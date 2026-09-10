import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';

export default function TabsLayout() {
  const { session } = useApp();
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
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabel: label(route.name === 'index' ? 'home' : route.name),
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name]} color={color} size={size} />
        ),
        tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 6 },
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
