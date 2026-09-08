import { Task } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

type DbTask = {
  id: string;
  title: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  category: Task['category'];
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

type FocusSession = {
  started_at: string;
  ended_at: string;
  duration_seconds: number;
};

const timeFor = (scheduledAt: string | null) =>
  scheduledAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(scheduledAt))
    : 'Any time today';

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

const taskSelect =
  'id,title,scheduled_at,duration_minutes,category,completed_at';

const goalSelect =
  'id,title,target_value,current_value,unit,due_at,created_at,updated_at';

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
      .order('scheduled_at', {
        ascending: true,
        nullsFirst: false,
      });

    if (error) {
      throw error;
    }

    return (data as DbTask[]).map(mapTask);
  },

  async addTask(
    userId: string,
    title: string,
    scheduledAt: string,
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
        category: 'study',
      })
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
        completed_at: task.done
          ? null
          : new Date().toISOString(),
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

    const { error } = await getSupabase()
      .from('study_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      throw error;
    }
  },

  async saveLanguage(userId: string, language: string) {
    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await getSupabase()
      .from('user_settings')
      .upsert({
        user_id: userId,
        language,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }
  },

  async recordFocus(
    userId: string,
    startedAt: Date,
    seconds: number,
  ) {
    if (!isSupabaseConfigured || seconds < 1) {
      return;
    }

    const { error } = await getSupabase()
      .from('focus_sessions')
      .insert({
        user_id: userId,
        started_at: startedAt.toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: seconds,
      });

    if (error) {
      throw error;
    }
  },

  async focusSessions(
    userId: string,
    start: Date,
    end: Date,
  ) {
    if (!isSupabaseConfigured) {
      return [] as FocusSession[];
    }

    const { data, error } = await getSupabase()
      .from('focus_sessions')
      .select('started_at,ended_at,duration_seconds')
      .eq('user_id', userId)
      .gte('started_at', start.toISOString())
      .lt('started_at', end.toISOString())
      .order('started_at', {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return (data ?? []) as FocusSession[];
  },

  async focusDays(
    userId: string,
    start: Date,
    end: Date,
  ) {
    if (!isSupabaseConfigured) {
      return [] as string[];
    }

    const { data, error } = await getSupabase()
      .from('focus_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .gte('started_at', start.toISOString())
      .lt('started_at', end.toISOString())
      .order('started_at', {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    const days = new Set<string>();

    for (const item of data ?? []) {
      const date = new Date(item.started_at);

      days.add(
        `${date.getFullYear()}-${String(
          date.getMonth() + 1,
        ).padStart(2, '0')}-${String(
          date.getDate(),
        ).padStart(2, '0')}`,
      );
    }

    return Array.from(days);
  },

  async goals(userId: string) {
    if (!isSupabaseConfigured) {
      return [] as StudyGoal[];
    }

    const { data, error } = await getSupabase()
      .from('study_goals')
      .select(goalSelect)
      .eq('user_id', userId)
      .order('due_at', {
        ascending: true,
        nullsFirst: false,
      })
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return (data ?? []).map((goal) =>
      mapGoal(goal as DbGoal),
    );
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

  async updateGoalProgress(
    goalId: string,
    currentValue: number,
  ) {
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

    const { error } = await getSupabase()
      .from('study_goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      throw error;
    }
  },
};