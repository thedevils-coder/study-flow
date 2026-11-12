import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type AdminStats = {
  users: number;
  activeSubscriptions: number;
  focusSessions: number;
};

export async function loadAdminStats(): Promise<AdminStats> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await getSupabase().functions.invoke('admin-stats', { method: 'POST' });
  if (error) throw error;
  return data as AdminStats;
}
