import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Server is not configured.' }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return json({ error: 'Unauthorized' }, 401);

  const userId = data.user.id;
  const admin = createClient(supabaseUrl, serviceKey);

  const owned = [
    'user_achievements',
    'ai_generations',
    'focus_sessions',
    'study_goals',
    'study_tasks',
    'user_settings',
    'subscriptions',
  ] as const;

  for (const table of owned) {
    const { error: tableError } = await admin.from(table).delete().eq('user_id', userId);
    if (tableError) return json({ error: 'Unable to delete account data.' }, 500);
  }

  const { error: profileError } = await admin.from('profiles').delete().eq('id', userId);
  if (profileError) return json({ error: 'Unable to delete account data.' }, 500);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: 'Unable to delete the authentication identity.' }, 500);

  return json({ ok: true });
});
