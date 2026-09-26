import { achievementsFromActivity } from '@/lib/achievements';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Achievement, AchievementId, FocusSession, StudyGoal } from '@/types';

type EarnedRow = {
  achievement_id: AchievementId;
  earned_at: string;
};

export const achievementService = {
  async list(userId: string, sessions: FocusSession[], goals: StudyGoal[]) {
    const earned = await this.earnedMap(userId);
    const computed = achievementsFromActivity({ sessions, goals, earned });
    await this.sync(userId, computed);
    return computed;
  },

  async earnedMap(userId: string) {
    if (!isSupabaseConfigured) return {} as Partial<Record<AchievementId, string>>;
    const { data, error } = await getSupabase()
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', userId);
    if (error) return {};
    const map: Partial<Record<AchievementId, string>> = {};
    for (const row of (data ?? []) as EarnedRow[]) {
      map[row.achievement_id] = row.earned_at;
    }
    return map;
  },

  async sync(userId: string, achievements: Achievement[]) {
    if (!isSupabaseConfigured) return;
    const newlyEarned = achievements.filter((item) => item.earned && !item.earnedAt);
    if (newlyEarned.length === 0) return;

    const { error } = await getSupabase().from('user_achievements').upsert(
      newlyEarned.map((item) => ({
        user_id: userId,
        achievement_id: item.id,
        earned_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,achievement_id', ignoreDuplicates: true },
    );
    if (error) {
      // Sync is best-effort; local computation still remains correct.
    }
  },
};
