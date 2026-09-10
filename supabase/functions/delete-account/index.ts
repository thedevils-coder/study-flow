import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response('Server is not configured.', { status: 500 });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  });
  const { data, error } = await userClient.auth.getUser();

  if (error || !data.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);

  if (deleteError) {
    return new Response(deleteError.message, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
