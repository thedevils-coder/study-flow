import { AiGeneration, AiKind, FocusSession, Task, TaskCategory, UserSettings } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { dayKey } from '@/lib/dates';

type DbTask = {
  id: string;
  title: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  category: TaskCategory;
  completed_at: string | null;
};

export type StudyGoal = {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DbGoal = {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

type DbGeneration = {
  id: string;
  kind: AiKind;
  prompt: string;
  result_text: string | null;
  created_at: string;
  tokens_used: number | null;
};

const timeFor = (scheduledAt: string | null) =>
  scheduledAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(scheduledAt))
    : '';

const mapTask = (task: DbTask): Task => ({
  id: task.id,
  title: task.title,
  time: timeFor(task.scheduled_at),
  scheduledAt: task.scheduled_at,
  done: Boolean(task.completed_at),
  category: task.category,
});

const mapGoal = (goal: DbGoal): StudyGoal => ({
  id: goal.id,
  title: goal.title,
  targetValue: goal.target_value,
  currentValue: goal.current_value,
  unit: goal.unit,
  dueAt: goal.due_at,
  createdAt: goal.created_at,
  updatedAt: goal.updated_at,
});

const mapGeneration = (row: DbGeneration): AiGeneration => ({
  id: row.id,
  kind: row.kind,
  prompt: row.prompt,
  resultText: row.result_text ?? '',
  createdAt: row.created_at,
  tokensUsed: row.tokens_used,
});

const taskSelect = 'id,title,scheduled_at,duration_minutes,category,completed_at';
const goalSelect = 'id,title,target_value,current_value,unit,due_at,created_at,updated_at';

export const defaultSettings = (language = 'en'): UserSettings => ({
  language,
  theme: 'light',
  focusMode: 'pomodoro',
  notificationsEnabled: true,
  studyReminders: true,
  goalReminders: true,
  aiContextEnabled: true,
  focusMinutes: 25,
});

export const studyData = {
  configured: isSupabaseConfigured,

  async tasks(userId: string) {
    if (!isSupabaseConfigured) {
      return [] as Task[];
    }

    const { data, error } = await getSupabase()
      .from('study_tasks')
      .select(taskSelect)
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true, nullsFirst: false });

    if (error) {
      throw error;
    }

    return (data as DbTask[]).map(mapTask);
  },

  async addTask(
    userId: string,
    title: string,
    scheduledAt: string | null,
    category: TaskCategory = 'study',
  ) {
    if (!isSupabaseConfigured) {
      throw Error('Supabase is not configured.');
    }

    const { data, error } = await getSupabase()
      .from('study_tasks')
      .insert({
        user_id: userId,
        title,
        scheduled_at: scheduledAt,
        category,
      })
      .select(taskSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapTask(data as DbTask);
  },

  async updateTask(
    taskId: string,
    patch: {
      title?: string;
      scheduledAt?: string | null;
      category?: TaskCategory;
    },
  ) {
    if (!isSupabaseConfigured) {
      throw Error('Supabase is not configured.');
    }

    const { data, error } = await getSupabase()
      .from('study_tasks')
      .update({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.scheduledAt !== undefined ? { scheduled_at: patch.scheduledAt } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select(taskSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapTask(data as DbTask);
  },

  async toggleTask(task: Task) {
    if (!isSupabaseConfigured) {
      throw Error('Supabase is not configured.');
    }

    const { data, error } = await getSupabase()
      .from('study_tasks')
      .update({
        completed_at: task.done ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .select(taskSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapTask(data as DbTask);
  },

  async deleteTask(taskId: string) {
    if (!isSupabaseConfigured) {
      throw Error('Supabase is not configured.');
    }

    const { error } = await getSupabase().from('study_tasks').delete().eq('id', taskId);

    if (error) {
      throw error;
    }
  },

  async saveLanguage(userId: string, language: string) {
    await this.saveSettings(userId, { language });
  },

  async settings(userId: string) {
    if (!isSupabaseConfigured) {
      return defaultSettings();
    }

    const { data, error } = await getSupabase()
      .from('user_settings')
      .select(
        'language,theme,focus_mode,notifications_enabled,study_reminders,goal_reminders,ai_context_enabled,focus_minutes',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return defaultSettings();
    }

    return {
      language: data.language || 'en',
      theme: (data.theme as UserSettings['theme']) || 'light',
      focusMode: (data.focus_mode as UserSettings['focusMode']) || 'pomodoro',
      notificationsEnabled: data.notifications_enabled !== false,
      studyReminders: data.study_reminders !== false,
      goalReminders: data.goal_reminders !== false,
      aiContextEnabled: data.ai_context_enabled !== false,
      focusMinutes: Number(data.focus_minutes) > 0 ? Number(data.focus_minutes) : 25,
    } satisfies UserSettings;
  },

  async saveSettings(userId: string, patch: Partial<UserSettings>) {
    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await getSupabase()
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...(patch.language !== undefined ? { language: patch.language } : {}),
        ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
        ...(patch.focusMode !== undefined ? { focus_mode: patch.focusMode } : {}),
        ...(patch.notificationsEnabled !== undefined
          ? { notifications_enabled: patch.notificationsEnabled }
          : {}),
        ...(patch.studyReminders !== undefined ? { study_reminders: patch.studyReminders } : {}),
        ...(patch.goalReminders !== undefined ? { goal_reminders: patch.goalReminders } : {}),
        ...(patch.aiContextEnabled !== undefined
          ? { ai_context_enabled: patch.aiContextEnabled }
          : {}),
        ...(patch.focusMinutes !== undefined ? { focus_minutes: patch.focusMinutes } : {}),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }

    if (patch.language) {
      await getSupabase()
        .from('profiles')
        .update({ language: patch.language })
        .eq('id', userId);
    }
  },

  async recordFocus(userId: string, startedAt: Date, seconds: number) {
    if (!isSupabaseConfigured || seconds < 1) {
      return;
    }

    const ended = new Date(startedAt.getTime() + seconds * 1000);

    const { error } = await getSupabase().from('focus_sessions').insert({
      user_id: userId,
      started_at: startedAt.toISOString(),
      ended_at: ended.toISOString(),
      duration_seconds: seconds,
    });

    if (error) {
      throw error;
    }
  },

  async focusSessions(userId: string, start: Date, end: Date) {
    if (!isSupabaseConfigured) {
      return [] as FocusSession[];
    }

    const { data, error } = await getSupabase()
      .from('focus_sessions')
      .select('id,started_at,ended_at,duration_seconds')
      .eq('user_id', userId)
      .gte('started_at', start.toISOString())
      .lt('started_at', end.toISOString())
      .order('started_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as FocusSession[];
  },

  async activityDays(userId: string, start: Date, end: Date) {
    if (!isSupabaseConfigured) {
      return [] as string[];
    }

    const client = getSupabase();

    const [sessions, tasks] = await Promise.all([
      client
        .from('focus_sessions')
        .select('started_at')
        .eq('user_id', userId)
        .gte('started_at', start.toISOString())
        .lt('started_at', end.toISOString()),
      client
        .from('study_tasks')
        .select('completed_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .gte('completed_at', start.toISOString())
        .lt('completed_at', end.toISOString()),
    ]);

    if (sessions.error) {
      throw sessions.error;
    }

    if (tasks.error) {
      throw tasks.error;
    }

    const days = new Set<string>();

    for (const item of sessions.data ?? []) {
      days.add(dayKey(new Date(item.started_at)));
    }

    for (const item of tasks.data ?? []) {
      if (item.completed_at) {
        days.add(dayKey(new Date(item.completed_at)));
      }
    }

    return Array.from(days);
  },

  async focusDays(userId: string, start: Date, end: Date) {
    return this.activityDays(userId, start, end);
  },

  async goals(userId: string) {
    if (!isSupabaseConfigured) {
      return [] as StudyGoal[];
    }

    const { data, error } = await getSupabase()
      .from('study_goals')
      .select(goalSelect)
      .eq('user_id', userId)
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((goal) => mapGoal(goal as DbGoal));
  },

  async addGoal(
    userId: string,
    title: string,
    targetValue: number,
    unit = 'hours',
    dueAt: string | null = null,
  ) {
    if (!isSupabaseConfigured) {
      throw Error('Supabase is not configured.');
    }

    if (!Number.isInteger(targetValue) || targetValue < 1) {
      throw Error('Goal target must be a positive whole number.');
    }

    const { data, error } = await getSupabase()
      .from('study_goals')
      .insert({
        user_id: userId,
        title,
        target_value: targetValue,
        current_value: 0,
        unit,
        due_at: dueAt,
      })
      .select(goalSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapGoal(data as DbGoal);
  },

  async updateGoal(
    goalId: string,
    patch: {
      title?: string;
      targetValue?: number;
      unit?: string;
      dueAt?: string | null;
    },
  ) {
    if (!isSupabaseConfigured) {
      throw Error('Supabase is not configured.');
    }

    if (patch.targetValue !== undefined && (!Number.isInteger(patch.targetValue) || patch.targetValue < 1)) {
      throw Error('Goal target must be a positive whole number.');
    }

    const { data, error } = await getSupabase()
      .from('study_goals')
      .update({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.targetValue !== undefined ? { target_value: patch.targetValue } : {}),
        ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
        ...(patch.dueAt !== undefined ? { due_at: patch.dueAt } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .select(goalSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapGoal(data as DbGoal);
  },

  async updateGoalProgress(goalId: string, currentValue: number) {
    if (!isSupabaseConfigured) {
      throw Error('Supabase is not configured.');
    }

    if (!Number.isInteger(currentValue) || currentValue < 0) {
      throw Error('Goal progress must be zero or greater.');
    }

    const { data, error } = await getSupabase()
      .from('study_goals')
      .update({
        current_value: currentValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .select(goalSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapGoal(data as DbGoal);
  },

  async deleteGoal(goalId: string) {
    if (!isSupabaseConfigured) {
      throw Error('Supabase is not configured.');
    }

    const { error } = await getSupabase().from('study_goals').delete().eq('id', goalId);

    if (error) {
      throw error;
    }
  },

  async aiHistory(userId: string, limit = 40) {
    if (!isSupabaseConfigured) {
      return [] as AiGeneration[];
    }

    const { data, error } = await getSupabase()
      .from('ai_generations')
      .select('id,kind,prompt,result_text,created_at,tokens_used')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => mapGeneration(row as DbGeneration));
  },

  async focusStats(userId: string) {
    if (!isSupabaseConfigured) {
      return { count: 0, totalSeconds: 0 };
    }

    const { data, error } = await getSupabase()
      .from('focus_sessions')
      .select('duration_seconds')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    return {
      count: rows.length,
      totalSeconds: rows.reduce((sum, row) => sum + (Number(row.duration_seconds) || 0), 0),
    };
  },

  async deleteAiGeneration(id: string) {
    if (!isSupabaseConfigured) {
      throw Error('Supabase is not configured.');
    }

    const { error } = await getSupabase().from('ai_generations').delete().eq('id', id);

    if (error) {
      throw error;
    }
  },
};
