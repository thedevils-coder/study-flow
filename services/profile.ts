import { getSupabase } from '@/lib/supabase';
import { Session } from '@/types';
export async function hydrateProfile(session: Session): Promise<Session> {
  const { data, error } = await getSupabase().from('profiles').select('display_name, role, language').eq('id', session.id).maybeSingle();
  if (error || !data) return session;
  return { ...session, name: data.display_name || session.name, role: data.role === 'admin' ? 'admin' : 'user', language: data.language || 'en' };
}
