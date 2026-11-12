import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { validateTaskTitle } from '@/lib/validation';
import type { Task, TaskCategory } from '@/types';

type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  scheduled_at: string | null;
  category: TaskCategory;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const select =
  'id,user_id,title,scheduled_at,category,completed_at,created_at,updated_at';

const mapTask = (row: TaskRow): Task => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  completed: Boolean(row.completed_at),
  scheduledAt: row.scheduled_at,
  category: row.category,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const taskService = {
  async list(userId: string) {
    if (!isSupabaseConfigured) return [] as Task[];
    const { data, error } = await getSupabase()
      .from('study_tasks')
      .select(select)
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data as TaskRow[]).map(mapTask);
  },

  async create(input: {
    userId: string;
    title: string;
    scheduledAt: string | null;
    category?: TaskCategory;
  }) {
    const valid = validateTaskTitle(input.title);
    if (!valid.ok) throw new Error(valid.error);
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

    const { data, error } = await getSupabase()
      .from('study_tasks')
      .insert({
        user_id: input.userId,
        title: valid.title,
        scheduled_at: input.scheduledAt,
        category: input.category ?? 'study',
      })
      .select(select)
      .single();
    if (error) throw error;
    return mapTask(data as TaskRow);
  },

  async update(input: {
    id: string;
    title?: string;
    scheduledAt?: string | null;
    completed?: boolean;
  }) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) {
      const valid = validateTaskTitle(input.title);
      if (!valid.ok) throw new Error(valid.error);
      patch.title = valid.title;
    }
    if (input.scheduledAt !== undefined) patch.scheduled_at = input.scheduledAt;
    if (input.completed !== undefined) {
      patch.completed_at = input.completed ? new Date().toISOString() : null;
    }

    const { data, error } = await getSupabase()
      .from('study_tasks')
      .update(patch)
      .eq('id', input.id)
      .select(select)
      .single();
    if (error) throw error;
    return mapTask(data as TaskRow);
  },

  async remove(id: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { error } = await getSupabase().from('study_tasks').delete().eq('id', id);
    if (error) throw error;
  },

  async createMany(userId: string, tasks: Array<{ title: string; scheduledAt: string }>) {
    const created: Task[] = [];
    for (const task of tasks) {
      created.push(
        await this.create({
          userId,
          title: task.title,
          scheduledAt: task.scheduledAt,
        }),
      );
    }
    return created;
  },
};
