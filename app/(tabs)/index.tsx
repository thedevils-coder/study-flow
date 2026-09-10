import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';
import { t } from '@/i18n';
import { endOfDay, isOverdue, startOfDay } from '@/lib/dates';

export default function Home() {
  const { session, tasks, toggleTask, streak } = useApp();
  const tr = (key: string) => t(session!.language, key);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const todayTasks = tasks.filter((task) => {
    if (!task.scheduledAt) {
      return true;
    }
    const scheduled = new Date(task.scheduledAt);
    return scheduled >= todayStart && scheduled < todayEnd;
  });
  const overdueCount = tasks.filter((task) => isOverdue(task.scheduledAt, task.done)).length;

  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.hello}>
          {tr('hello')}, {session!.name}! 👋
        </Text>
        <Text style={s.sub}>{tr('productive')}</Text>

        <View style={s.streak}>
          <View>
            <Text style={s.white}>{tr('streak')}</Text>
            <Text style={s.big}>{streak.current}</Text>
            <Text style={s.white}>{tr('days')}</Text>
          </View>
          <Text style={s.fire} accessibilityLabel={tr('streak')}>
            🔥
          </Text>
        </View>

        <Pressable
          style={s.aiCard}
          onPress={() => router.push('/ai-meter')}
          accessibilityRole="button"
          accessibilityLabel={tr('aiMeter')}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.aiBadge}>{tr('newBadge')}</Text>
            <Text style={s.aiTitle}>{tr('aiMeter')}</Text>
            <Text style={s.aiBody}>{tr('aiHeroDescription')}</Text>
          </View>
          <Image source={require('../../assets/images/leo-robot.png')} style={s.robot} />
        </Pressable>

        <View style={s.shortcuts}>
          <Pressable style={s.shortcut} onPress={() => router.push('/leo')}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.purple} />
            <Text style={s.shortcutText}>{tr('leo')}</Text>
          </Pressable>
          <Pressable style={s.shortcut} onPress={() => router.push('/schedule-maker')}>
            <Ionicons name="calendar-outline" size={20} color={colors.purple} />
            <Text style={s.shortcutText}>{tr('studySchedule')}</Text>
          </Pressable>
        </View>

        <View style={s.heading}>
          <Text style={s.title}>{tr('today')}</Text>
          <Text onPress={() => router.push('/task/new')} style={s.link}>
            {tr('addTask')}
          </Text>
        </View>

        {overdueCount > 0 ? (
          <Text style={s.overdue}>
            {tr('overdueTasks')}: {overdueCount}
          </Text>
        ) : null}

        {todayTasks.length === 0 ? (
          <EmptyState title={tr('noTasksToday')} body={tr('addTaskHint')} />
        ) : (
          todayTasks.slice(0, 8).map((task) => (
            <Card key={task.id} style={s.task}>
              <Ionicons
                onPress={() => toggleTask(task.id)}
                name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={task.done ? colors.success : colors.purple}
                accessibilityLabel={task.done ? tr('markIncomplete') : tr('markComplete')}
              />
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/task/${task.id}`)}>
                <Text style={[s.taskTitle, task.done && s.done]}>{task.title}</Text>
                <Text style={s.time}>
                  {task.time}
                  {isOverdue(task.scheduledAt, task.done) ? ` · ${tr('overdue')}` : ''}
                </Text>
              </Pressable>
              <Ionicons name="chevron-forward" size={17} color={colors.muted} />
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: 20, paddingBottom: 40 },
  hello: { fontSize: 25, fontWeight: '900', color: colors.ink },
  sub: { color: colors.muted, marginTop: 5, marginBottom: 20 },
  streak: {
    backgroundColor: colors.purple,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  white: { color: 'white', fontWeight: '600' },
  big: { fontSize: 34, color: 'white', fontWeight: '900', marginVertical: 3 },
  fire: { fontSize: 38 },
  aiCard: {
    backgroundColor: colors.soft,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    color: colors.ink,
    fontWeight: '900',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  aiTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 6 },
  aiBody: { color: colors.muted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  robot: { width: 72, height: 72 },
  shortcuts: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  shortcut: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  shortcutText: { fontWeight: '800', color: colors.ink, fontSize: 13 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 19, fontWeight: '900', color: colors.ink },
  link: { color: colors.purple, fontWeight: '800' },
  overdue: { color: colors.danger, fontWeight: '700', marginBottom: 8 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  taskTitle: { fontWeight: '800', color: colors.ink },
  time: { fontSize: 12, color: colors.muted, marginTop: 4 },
  done: { textDecorationLine: 'line-through', color: colors.muted },
});
