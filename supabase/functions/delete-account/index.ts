/// <reference path="./runtime.d.ts" />
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not configured.');
    }

    if (!supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY is not configured.');
    }

    if (!supabaseServiceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
    }

    const authorization = req.headers.get('Authorization');

    if (!authorization) {
      return json({ error: 'Missing Authorization header.' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError) {
      console.error('getUser error:', userError);

      return json(
        {
          error: 'Unable to verify authenticated user.',
          details: userError.message,
        },
        401,
      );
    }

    if (!user) {
      return json({ error: 'Not authenticated.' }, 401);
    }

    console.log('Deleting account:', user.id);

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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
      const { error: tableError } = await adminClient
        .from(table)
        .delete()
        .eq('user_id', user.id);

      if (tableError) {
        console.error('delete table error:', table, tableError);
        return json({ error: 'Unable to delete account data.' }, 500);
      }
    }

    const artifacts = adminClient.storage.from('ai-artifacts');
    for (let offset = 0; ; offset += 1000) {
      const { data: objects, error: listError } = await artifacts.list(user.id, {
        limit: 1000,
        offset,
      });

      if (listError) {
        console.error('list artifacts error:', listError);
        return json({ error: 'Unable to delete account data.' }, 500);
      }

      if (!objects || objects.length === 0) break;

      const paths = objects
        .map((object) => object.name)
        .filter((name): name is string => Boolean(name))
        .filter((name) => !name.includes('/') && name !== '..' && name !== '.')
        .map((name) => `${user.id}/${name}`);

      if (paths.length > 0) {
        const { error: removeError } = await artifacts.remove(paths);
        if (removeError) {
          console.error('remove artifacts error:', removeError);
          return json({ error: 'Unable to delete account data.' }, 500);
        }
      }

      if (objects.length < 1000) break;
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('delete profile error:', profileError);
      return json({ error: 'Unable to delete account data.' }, 500);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('deleteUser error:', deleteError);

      return json(
        {
          error: 'Failed to delete account.',
          details: deleteError.message,
        },
        500,
      );
    }

    console.log('Account deleted:', user.id);

    return json({
      success: true,
      message: 'Account deleted successfully.',
    });
  } catch (error) {
    console.error('delete-account unexpected error:', error);

    return json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error.',
      },
      500,
    );
  }
});
