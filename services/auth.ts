import { Session } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export const auth = {
  configured: isSupabaseConfigured,
  async restore(): Promise<Session | null> {
    if (!isSupabaseConfigured) return null;
    const { data } = await getSupabase().auth.getSession();
    return data.session ? toSession(data.session.user) : null;
  },
  async sendMagicLink(email: string, name: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { error } = await getSupabase().auth.signInWithOtp({ email, options: { data: { display_name: name }, emailRedirectTo: 'studyflow://' } });
    if (error) throw error;
  },
  async completeMagicLink(url: string): Promise<Session | null> {
    if (!isSupabaseConfigured) return null;
    const code = new URL(url).searchParams.get('code');
    if (!code) return null;
    const { data, error } = await getSupabase().auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.user ? toSession(data.user) : null;
  },
  async signOut() { if (isSupabaseConfigured) await getSupabase().auth.signOut(); },
};

export function toSession(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Session {
  const displayName = typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : 'Student';
  return { id: user.id, email: user.email ?? '', name: displayName, role: 'user', language: 'en', plan: 'none', subscriptionStatus: 'none' };
}
