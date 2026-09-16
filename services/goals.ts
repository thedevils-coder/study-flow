import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { clampGoalProgress, validateGoalInput } from '@/lib/validation';
import { isMissingRelationError } from '@/lib/errors';
import type { StudyGoal } from '@/types';

type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

const select =
  'id,user_id,title,target_value,current_value,unit,due_at,created_at,updated_at';

const mapGoal = (row: GoalRow): StudyGoal => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  targetValue: row.target_value,
  currentValue: row.current_value,
  unit: row.unit,
  dueAt: row.due_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const goalService = {
  async list(userId: string) {
    if (!isSupabaseConfigured) return [] as StudyGoal[];
    const { data, error } = await getSupabase()
      .from('study_goals')
      .select(select)
      .eq('user_id', userId)
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingRelationError(error)) return [] as StudyGoal[];
      throw error;
    }
    return (data as GoalRow[]).map(mapGoal);
  },

  async create(input: {
    userId: string;
    title: string;
    target: string;
    unit?: string;
    dueAt?: string | null;
  }) {
    const valid = validateGoalInput(input.title, input.target, input.unit ?? 'hours');
    if (!valid.ok) throw new Error(valid.error);
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

    const { data, error } = await getSupabase()
      .from('study_goals')
      .insert({
        user_id: input.userId,
        title: valid.title,
        target_value: valid.targetValue,
        current_value: 0,
        unit: valid.unit,
        due_at: input.dueAt ?? null,
      })
      .select(select)
      .single();
    if (error) throw error;
    return mapGoal(data as GoalRow);
  },

  async update(input: {
    id: string;
    title?: string;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    dueAt?: string | null;
  }) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.targetValue !== undefined) patch.target_value = input.targetValue;
    if (input.currentValue !== undefined) patch.current_value = clampGoalProgress(input.currentValue);
    if (input.unit !== undefined) patch.unit = input.unit;
    if (input.dueAt !== undefined) patch.due_at = input.dueAt;

    const { data, error } = await getSupabase()
      .from('study_goals')
      .update(patch)
      .eq('id', input.id)
      .select(select)
      .single();
    if (error) throw error;
    return mapGoal(data as GoalRow);
  },

  async remove(id: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { error } = await getSupabase().from('study_goals').delete().eq('id', id);
    if (error) throw error;
  },
};
