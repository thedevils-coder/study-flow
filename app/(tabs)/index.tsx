import { router } from 'expo-router';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, ThemedSafeArea } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { formatDateTime, t } from '@/i18n';
import { endOfDay, isOverdue, sortByScheduledAt, startOfDay } from '@/lib/dates';
import { useColors } from '@/lib/use-colors';

export default function Home() {
  const { session, tasks, toggleTask, streak } = useApp();
  const tr = (key: string) => t(session!.language, key);
  const palette = useColors();
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const todayTasks = sortByScheduledAt(
    tasks.filter((task) => {
      if (!task.scheduledAt) {
        return true;
      }
      const scheduled = new Date(task.scheduledAt);
      return scheduled >= todayStart && scheduled < todayEnd;
    }),
  );
  const overdueCount = tasks.filter((task) => isOverdue(task.scheduledAt, task.done)).length;

  return (
    <ThemedSafeArea>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.hello, { color: palette.ink }]}>
          {tr('hello')}, {session!.name}! 👋
        </Text>
        <Text style={[s.sub, { color: palette.muted }]}>{tr('productive')}</Text>

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
          style={[s.aiCard, { backgroundColor: palette.soft }]}
          onPress={() => router.push('/ai-meter')}
          accessibilityRole="button"
          accessibilityLabel={tr('aiMeter')}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.aiBadge}>{tr('newBadge')}</Text>
            <Text style={[s.aiTitle, { color: palette.ink }]}>{tr('aiMeter')}</Text>
            <Text style={[s.aiBody, { color: palette.muted }]}>{tr('aiHeroDescription')}</Text>
          </View>
          <Image source={require('../../assets/images/leo-robot.png')} style={s.robot} />
        </Pressable>

        <View style={s.shortcuts}>
          <Pressable style={[s.shortcut, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.push('/leo')}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={palette.purple} />
            <Text style={[s.shortcutText, { color: palette.ink }]}>{tr('leo')}</Text>
          </Pressable>
          <Pressable style={[s.shortcut, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.push('/schedule-maker')}>
            <Ionicons name="calendar-outline" size={20} color={palette.purple} />
            <Text style={[s.shortcutText, { color: palette.ink }]}>{tr('studySchedule')}</Text>
          </Pressable>
        </View>

        <View style={s.heading}>
          <Text style={[s.title, { color: palette.ink }]}>{tr('today')}</Text>
          <Text onPress={() => router.push('/task/new')} style={[s.link, { color: palette.purple }]}>
            {tr('addTask')}
          </Text>
        </View>

        {overdueCount > 0 ? (
          <Text style={[s.overdue, { color: palette.danger }]}>
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
                color={task.done ? palette.success : palette.purple}
                accessibilityLabel={task.done ? tr('markIncomplete') : tr('markComplete')}
              />
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/task/${task.id}`)}>
                <Text style={[s.taskTitle, { color: palette.ink }, task.done && s.done]}>{task.title}</Text>
                <Text style={[s.time, { color: palette.muted }]}>
                  {task.scheduledAt ? formatDateTime(session!.language, task.scheduledAt) : tr('anyTime')}
                  {isOverdue(task.scheduledAt, task.done) ? ` · ${tr('overdue')}` : ''}
                </Text>
              </Pressable>
              <Ionicons name="chevron-forward" size={17} color={palette.muted} />
            </Card>
          ))
        )}
      </ScrollView>
    </ThemedSafeArea>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  hello: { fontSize: 25, fontWeight: '900' },
  sub: { marginTop: 5, marginBottom: 20 },
  streak: {
    backgroundColor: '#5932E8',
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
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5C518',
    color: '#15132A',
    fontWeight: '900',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  aiTitle: { fontSize: 18, fontWeight: '900', marginTop: 6 },
  aiBody: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  robot: { width: 72, height: 72 },
  shortcuts: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  shortcut: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  shortcutText: { fontWeight: '800', fontSize: 13 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 19, fontWeight: '900' },
  link: { fontWeight: '800' },
  overdue: { fontWeight: '700', marginBottom: 8 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  taskTitle: { fontWeight: '800' },
  time: { fontSize: 12, marginTop: 4 },
  done: { textDecorationLine: 'line-through' },
});
