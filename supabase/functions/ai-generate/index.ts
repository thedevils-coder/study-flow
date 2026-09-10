import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const kinds = ['notes', 'summary', 'flashcards', 'quiz', 'explain', 'leo', 'schedule', 'other'] as const;
type Kind = (typeof kinds)[number];

const BASIC_KINDS = new Set<Kind>(['notes', 'summary', 'explain', 'leo', 'schedule', 'other']);
const PRO_KINDS = new Set<Kind>(['flashcards', 'quiz']);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Server is not configured.' }, 500);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: 'Sign in required.' }, 401);
  }

  const userId = userData.user.id;
  const payload = await request.json().catch(() => ({}));
  const kind = String(payload.kind || 'other') as Kind;
  const prompt = String(payload.prompt || '').trim();

  if (!kinds.includes(kind) || prompt.length < 1 || prompt.length > 8000) {
    return json({ error: 'Invalid request.' }, 400);
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('state, entitlement_id, entitlement_ids, product_id, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  const entitlementIds = [
    ...(subscription?.entitlement_ids ?? []),
    subscription?.entitlement_id,
    subscription?.product_id,
  ]
    .filter(Boolean)
    .map((value: string) => String(value).toLowerCase());

  const active =
    subscription &&
    ['active', 'cancelled', 'ending', 'pending'].includes(String(subscription.state)) &&
    (!subscription.expires_at || new Date(subscription.expires_at).getTime() > Date.now());

  const isPro = active && entitlementIds.some((value) => value.includes('pro'));
  const isBasic =
    active &&
    (isPro ||
      entitlementIds.some((value) =>
        ['basic', 'premium', 'monthly', 'yearly'].some((part) => value.includes(part)),
      ));

  const trialActive =
    active &&
    String(subscription?.state) === 'active' &&
    entitlementIds.some((value) => value.includes('trial'));

  const tier = isPro ? 'pro' : isBasic || trialActive || active ? 'basic' : 'none';

  if (tier === 'none') {
    return json({ error: 'Start a free trial or choose Basic to use AI Meter.' }, 402);
  }

  if (PRO_KINDS.has(kind) && tier !== 'pro') {
    return json({ error: 'This tool is included with Study Flow Pro.' }, 402);
  }

  if (!BASIC_KINDS.has(kind) && !PRO_KINDS.has(kind)) {
    return json({ error: 'Unsupported generation type.' }, 400);
  }

  const limit = tier === 'pro' ? 80 : 10;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const { count, error: countError } = await admin
    .from('ai_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start.toISOString());

  if (countError) {
    return json({ error: 'Unable to check usage.' }, 500);
  }

  if ((count ?? 0) >= limit) {
    return json({ error: 'You have reached today’s AI limit for your plan.', usage: { remaining: 0, limit } }, 429);
  }

  const apiKey = Deno.env.get('AI_API_KEY');
  const apiUrl = Deno.env.get('AI_API_URL') ?? 'https://api.openai.com/v1/chat/completions';
  const model = Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini';

  if (!apiKey) {
    return json({
      error: 'AI generation is not configured on the server yet. Study Flow never stores AI API keys in the app.',
    }, 503);
  }

  const maxTokens = tier === 'pro' ? 2500 : 800;
  const context = payload.context && typeof payload.context === 'object' ? payload.context : null;
  const safeContext = context
    ? JSON.stringify({
        tasks: Array.isArray(context.tasks) ? context.tasks.slice(0, 20) : [],
        goals: Array.isArray(context.goals) ? context.goals.slice(0, 10) : [],
        focusMinutesThisWeek: Number(context.focusMinutesThisWeek) || 0,
      })
    : '';

  const system = [
    'You are Leo, Study Flow’s personal AI study assistant.',
    'Be accurate, calm, and practical. Do not invent the user’s tasks, goals, or study time.',
    'If context is missing, say so. Never mention API keys, tokens, payments, or passwords.',
    kind === 'flashcards' ? 'Respond as concise Q/A flashcards.' : '',
    kind === 'quiz' ? 'Respond as a short quiz with answers at the end.' : '',
    kind === 'schedule'
      ? 'Propose a realistic study schedule as a JSON array of {title, scheduledAt, minutes, reason}. Do not overwrite existing tasks; avoid obvious conflicts.'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const completion = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `${prompt}${safeContext ? `\n\nUser study context:\n${safeContext}` : ''}`,
        },
      ],
    }),
  });

  if (!completion.ok) {
    return json({ error: 'The AI provider could not complete that request.' }, 502);
  }

  const body = await completion.json();
  const text = String(body?.choices?.[0]?.message?.content ?? '').trim();
  const tokens = Number(body?.usage?.total_tokens) || null;

  const { data: stored, error: storeError } = await admin
    .from('ai_generations')
    .insert({
      user_id: userId,
      kind,
      prompt,
      result_text: text,
      result_meta: { tier, provider: 'server' },
      model,
      tokens_used: tokens,
    })
    .select('id')
    .single();

  if (storeError) {
    return json({ error: 'Unable to store generation.' }, 500);
  }

  return json({
    id: stored.id,
    text,
    kind,
    usage: { remaining: Math.max(0, limit - (count ?? 0) - 1), limit },
  });
});
