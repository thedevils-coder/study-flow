import { getSupabase } from '@/lib/supabase';
import { Session } from '@/types';
import { studyData } from '@/services/study-data';

export async function hydrateProfile(session: Session): Promise<Session> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('display_name, role, language')
    .eq('id', session.id)
    .maybeSingle();

  const base: Session = error || !data
    ? session
    : {
        ...session,
        name: data.display_name || session.name,
        role: data.role === 'admin' ? 'admin' : 'user',
        language: data.language || session.language || 'en',
      };

  try {
    const settings = await studyData.settings(session.id);
    return {
      ...base,
      language: settings.language || base.language,
    };
  } catch {
    return base;
  }
}

export async function updateDisplayName(userId: string, name: string) {
  const { error } = await getSupabase()
    .from('profiles')
    .update({ display_name: name })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}
