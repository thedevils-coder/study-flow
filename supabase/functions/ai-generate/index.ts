import { createClient } from 'npm:@supabase/supabase-js@2';

import { buildStudyPdf } from './pdf.ts';
import {
  chatGemini,
  chatOpenAI,
  configuredSecret,
  DEFAULT_GEMINI_IMAGE_MODEL,
  generateGeminiImage,
  generateOpenAiImage,
  geminiImageQuotaMessage,
  imageActionAfterGeminiError,
  ProviderError,
  resolveGeminiChatModel,
  selectResearchProvider,
  selectTextChatProvider,
} from './providers.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const kinds = ['notes', 'summary', 'flashcards', 'quiz', 'explain', 'leo', 'schedule', 'other'] as const;
type Kind = (typeof kinds)[number];
const PRO_KINDS = new Set<Kind>(['flashcards', 'quiz', 'leo', 'schedule']);

type DetailLevel = 'short' | 'balanced' | 'detailed';
type AiMode =
  | 'fast_answer'
  | 'detailed_answer'
  | 'research'
  | 'image'
  | 'pdf'
  | 'notes'
  | 'quiz'
  | 'flashcards'
  | 'study_plan'
  | 'file_analysis';
type ResponseType = 'answer' | 'research' | 'image' | 'pdf' | 'notes' | 'quiz' | 'study_plan' | 'error';

type Source = { title: string; url: string; domain?: string };
type Artifact = { type: 'image' | 'pdf'; name: string; mime: string; url?: string; dataUrl?: string };
type ChatTurn = { role: 'user' | 'assistant'; content: string };
type Attachment = { name?: string; mime?: string; kind?: string; dataBase64?: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

const fail = (status: number, error: string, code: string, details?: Record<string, unknown>) =>
  json({ success: false, error, code, details, responseType: 'error' }, status);

function detectDetailLevel(prompt: string, fallback: DetailLevel = 'balanced'): DetailLevel {
  const text = prompt.trim();
  const detailed =
    /\b(in detail|detailed|deeply|full explanation|complete explanation|exam notes|revision notes|step by step|step-by-step|teach me from beginner|comprehensive|long answer|in depth|in-depth|thoroughly)\b/i.test(
      text,
    );
  const short =
    /\b(briefly|short|quick answer|only the answer|just the answer|in one sentence|tl;dr|tldr|concise|summarize this briefly)\b/i.test(
      text,
    ) ||
    (/\bdefine\b/i.test(text) && !detailed && text.split(/\s+/).length < 12);
  if (short && !detailed) return 'short';
  if (detailed) return 'detailed';
  return fallback;
}

function classify(prompt: string, hasAttachments: boolean, preferred: DetailLevel): { mode: AiMode; detailLevel: DetailLevel } {
  const text = prompt.trim();
  const detailLevel = detectDetailLevel(text, preferred);
  if (
    /\b(create|generate|make|draw|visualize|design)\b.{0,40}\b(image|picture|illustration|diagram|visual|infographic|labeled diagram)\b|\b(diagram|illustration|infographic|visualize this)\b/i.test(
      text,
    )
  ) {
    return { mode: 'image', detailLevel };
  }
  if (/\b(pdf|worksheet|revision guide|export that|export this|turn (?:this|that|it) into a (?:pdf|document)|make a report)\b/i.test(text)) {
    return { mode: 'pdf', detailLevel };
  }
  if (hasAttachments) return { mode: 'file_analysis', detailLevel };
  if (/\b(latest|current|recent|today|this year|202[5-9]|developments?|news|statistics?|verify|look up|search|google|what(?:'|’)s new)\b/i.test(text)) {
    return { mode: 'research', detailLevel };
  }
  if (/\b(study plan|revision plan|revision schedule|timetable|study schedule)\b/i.test(text)) return { mode: 'study_plan', detailLevel };
  if (/\b(quiz|mcqs?|multiple[- ]choice|practice questions?|quiz me)\b/i.test(text)) return { mode: 'quiz', detailLevel };
  if (/\bflashcards?\b/i.test(text)) return { mode: 'flashcards', detailLevel };
  if (/\b(revision notes|exam notes|study notes|make notes|detailed notes|turn this into notes)\b/i.test(text)) {
    return { mode: 'notes', detailLevel };
  }
  if (detailLevel === 'detailed') return { mode: 'detailed_answer', detailLevel };
  return { mode: 'fast_answer', detailLevel };
}

function kindForMode(mode: AiMode, requested: Kind): Kind {
  if (requested !== 'leo' && requested !== 'other') return requested;
  if (mode === 'quiz') return 'quiz';
  if (mode === 'flashcards') return 'flashcards';
  if (mode === 'notes') return 'notes';
  if (mode === 'study_plan') return 'schedule';
  return requested;
}

function responseTypeFor(mode: AiMode): ResponseType {
  if (mode === 'research') return 'research';
  if (mode === 'image') return 'image';
  if (mode === 'pdf') return 'pdf';
  if (mode === 'notes') return 'notes';
  if (mode === 'quiz' || mode === 'flashcards') return 'quiz';
  if (mode === 'study_plan') return 'study_plan';
  return 'answer';
}

function lengthInstruction(detailLevel: DetailLevel) {
  if (detailLevel === 'short') {
    return [
      'Response length: SHORT.',
      'Give a concise answer that directly addresses the question.',
      'Normally use 1-3 short paragraphs or a small bullet list.',
      'Do not expand into extra background, recap sections, or padding.',
    ].join(' ');
  }
  if (detailLevel === 'detailed') {
    return [
      'Response length: DETAILED.',
      'Give a genuinely thorough explanation.',
      'Cover the important concepts step-by-step.',
      'Include examples, explanations, caveats, and practical details when they help the student.',
      'Do not intentionally keep the answer short.',
      'If the question is broad, write a substantial answer rather than a summary.',
    ].join(' ');
  }
  return [
    'Response length: BALANCED.',
    'Give a normal helpful study-assistant answer.',
    'Explain the important points and include examples when useful.',
    'Normally use about 4-8 paragraphs or bullets depending on the question.',
    'Do not shrink this into a short summary, and do not pad with filler.',
  ].join(' ');
}

function loadingLabel(mode: AiMode, detailLevel: DetailLevel) {
  if (mode === 'image') return 'Generating image…';
  if (mode === 'pdf') return 'Creating your PDF…';
  if (mode === 'file_analysis') return 'Reading your material…';
  if (mode === 'research') return 'Checking current sources…';
  if (mode === 'study_plan') return 'Building a study plan…';
  if (mode === 'quiz') return 'Writing practice questions…';
  if (mode === 'flashcards') return 'Making flashcards…';
  if (mode === 'notes') return 'Writing notes…';
  if (mode === 'detailed_answer') return 'Preparing a detailed answer…';
  return detailLevel === 'short' ? 'Finding a short answer…' : 'Leo is thinking…';
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function sanitizeSources(input: unknown): Source[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const item of input) {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
    const url = typeof record?.url === 'string' ? record.url.trim() : typeof record?.uri === 'string' ? record.uri.trim() : '';
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    const title = typeof record?.title === 'string' && record.title.trim() ? record.title.trim() : domainFromUrl(url) || 'Source';
    sources.push({ title, url, domain: domainFromUrl(url) });
  }
  return sources.slice(0, 8);
}

function packMessages(history: ChatTurn[], prompt: string) {
  const recent = history.slice(-8).map((item) => ({
    role: item.role === 'assistant' ? 'assistant' : 'user',
    content: String(item.content || '').slice(0, 1800),
  }));
  const older = history.slice(0, Math.max(0, history.length - 8));
  const summary = older.length
    ? older
        .slice(-10)
        .map((item) => `${item.role === 'user' ? 'Student' : 'Leo'}: ${String(item.content || '').slice(0, 160)}`)
        .join('\n')
    : '';
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  if (summary) messages.push({ role: 'user', content: `Earlier in this conversation:\n${summary}` });
  messages.push(...recent);
  messages.push({ role: 'user', content: prompt });
  return messages;
}

function maxTokens(_tier: string, mode: AiMode, detailLevel: DetailLevel) {
  if (mode === 'pdf' || mode === 'notes') return 32768;
  if (detailLevel === 'short') return 8192;
  if (detailLevel === 'detailed' || mode === 'detailed_answer') return 32768;
  return 16384;
}

function thinkingLevel(detailLevel: DetailLevel): 'low' | 'medium' {
  return detailLevel === 'short' ? 'low' : 'medium';
}

const sendSse = (event: string, data: unknown) =>
  new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const payload = await request.json().catch(() => ({}));
  const wantsStream = Boolean(payload.stream) || /text\/event-stream/i.test(request.headers.get('accept') || '');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return fail(500, 'The ai-generate function is missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.', 'server_not_configured');
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  });
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return fail(401, 'Sign in required.', 'unauthenticated');

  const userId = userData.user.id;
  const kind = String(payload.kind || 'other') as Kind;
  const prompt = String(payload.prompt || '').trim();
  const history = Array.isArray(payload.messages) ? (payload.messages as ChatTurn[]) : [];
  const attachments = Array.isArray(payload.attachments) ? (payload.attachments as Attachment[]).slice(0, 2) : [];
  const preferredDetail: DetailLevel =
    payload.detailLevel === 'short' || payload.detailLevel === 'detailed' ? payload.detailLevel : 'balanced';
  if (!kinds.includes(kind) || prompt.length < 1 || prompt.length > 8000) {
    return fail(400, 'Invalid request.', 'invalid_request');
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from('subscriptions')
    .select('state, entitlement_id, entitlement_ids, product_id, expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (subscriptionError && /schema cache|does not exist|PGRST205|42P01/i.test(subscriptionError.message)) {
    return fail(503, 'The subscriptions table is missing. Apply supabase/migrations/202609160002_align_existing_project.sql.', 'missing_relation');
  }

  const entitlementIds = [...(subscription?.entitlement_ids ?? []), subscription?.entitlement_id, subscription?.product_id]
    .filter(Boolean)
    .map((value: string) => String(value).toLowerCase());
  const active =
    Boolean(subscription) &&
    ['active', 'cancelled', 'ending', 'pending'].includes(String(subscription?.state)) &&
    (!subscription?.expires_at || new Date(String(subscription.expires_at)).getTime() > Date.now());
  const isPro = active && entitlementIds.some((value) => value.includes('pro'));
  const trialActive = active && entitlementIds.some((value) => value.includes('trial'));
  const isBasic =
    active &&
    (isPro || entitlementIds.some((value) => ['basic', 'premium', 'monthly', 'yearly'].some((part) => value.includes(part))));
  const tier = isPro ? 'pro' : isBasic || trialActive || active ? 'basic' : 'none';
  if (tier === 'none') return fail(402, 'Start a free trial or choose Basic to use AI Meter.', 'payment_required');
  if (PRO_KINDS.has(kind) && tier !== 'pro' && !trialActive) {
    return fail(402, 'This tool is included with Study Flow Pro and the free trial.', 'payment_required');
  }

  const limit = tier === 'pro' ? 80 : 10;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const counted = await admin
    .from('ai_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .eq('status', 'success');
  const countResult =
    counted.error && /status|PGRST204|42703/i.test(counted.error.message)
      ? await admin.from('ai_generations').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', start.toISOString())
      : counted;
  if (countResult.error && /schema cache|does not exist|PGRST205|42P01/i.test(countResult.error.message)) {
    return fail(503, 'The ai_generations table is missing. Apply the Study Flow AI migrations.', 'missing_relation');
  }
  if (countResult.error) return fail(500, 'Unable to check usage.', 'database_error');
  const used = countResult.count ?? 0;
  if (used >= limit) {
    return json(
      { success: false, error: 'You have reached today’s AI limit for your plan.', code: 'rate_limited', usage: { remaining: 0, limit, used } },
      429,
    );
  }

  const route = classify(prompt, attachments.length > 0, preferredDetail);
  const storeKind = kindForMode(route.mode, kind);
  const started = Date.now();

  const openaiKey = configuredSecret(Deno.env.get('AI_API_KEY'));
  const openaiUrl = Deno.env.get('AI_API_URL') ?? 'https://api.openai.com/v1/chat/completions';
  const fastModel = Deno.env.get('AI_FAST_MODEL') ?? Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini';
  const deepModel = Deno.env.get('AI_MODEL') ?? fastModel;
  const geminiKey = configuredSecret(Deno.env.get('GEMINI_API_KEY'));
  const geminiModel = resolveGeminiChatModel(Deno.env.get('GEMINI_MODEL'));
  const imageKey = configuredSecret(Deno.env.get('IMAGE_API_KEY')) ?? openaiKey;
  const textChat = selectTextChatProvider({ openaiKey, geminiKey });
  const research = selectResearchProvider({ geminiKey });
  const imageUrl = Deno.env.get('IMAGE_API_URL') ?? 'https://api.openai.com/v1/images/generations';
  const imageModel = Deno.env.get('IMAGE_MODEL') ?? 'dall-e-3';

  const system = [
    'You are Leo, Study Flow’s personal AI study assistant.',
    'Be accurate, calm and practical. Do not invent the user’s tasks, goals, files or study time.',
    'Never mention API keys, tokens, payments or passwords.',
    'Do not fabricate sources or URLs. If you did not use web research, do not claim that you did.',
    'Resolve pronouns such as it, this, that, these, those, above, and previous using the conversation.',
    lengthInstruction(route.detailLevel),
    route.mode === 'quiz' ? 'Respond as a short quiz with answers after the questions.' : '',
    route.mode === 'flashcards' ? 'Respond as concise question/answer flashcards.' : '',
    route.mode === 'notes' ? 'Write structured revision notes with headings and short bullets.' : '',
    route.mode === 'study_plan' ? 'Propose a realistic study schedule as JSON array of {title, scheduledAt, minutes, reason} when useful.' : '',
    route.mode === 'file_analysis' ? 'Use the attached study material as the primary source. Do not replace it with unrelated content.' : '',
    route.mode === 'pdf' ? 'Write a complete study document with title, headings, bullets and short paragraphs. Stay on the conversation topic.' : '',
    route.mode === 'image' ? 'Describe the educational visual that should be generated. Stay on the conversation topic.' : '',
    route.mode === 'research' ? 'Use current web research. Cite only grounded sources. If sources disagree, explain the difference.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const studyContext =
    payload.context && typeof payload.context === 'object'
      ? JSON.stringify({
          tasks: Array.isArray(payload.context.tasks) ? payload.context.tasks.slice(0, 20) : [],
          goals: Array.isArray(payload.context.goals) ? payload.context.goals.slice(0, 10) : [],
          focusMinutesThisWeek: Number(payload.context.focusMinutesThisWeek) || 0,
        })
      : '';

  const packed = packMessages(history, `${prompt}${studyContext ? `\n\nUser study context:\n${studyContext}` : ''}`);
  const chatMessages = [{ role: 'system' as const, content: system }, ...packed];
  const useFast = route.mode === 'fast_answer' && route.detailLevel !== 'detailed';
  const textMode = !['image', 'pdf'].includes(route.mode);

  try {
    if (route.mode === 'research' && research.provider === 'none') {
      return fail(503, 'Live Google/Gemini research is not configured yet. Set GEMINI_API_KEY on the ai-generate function.', 'research_not_configured');
    }
    if (route.mode === 'image' && !imageKey && !geminiKey) {
      return fail(503, 'Image generation is not configured yet. Set IMAGE_API_KEY or GEMINI_API_KEY on the ai-generate function.', 'image_not_configured');
    }
    if (route.mode === 'pdf' && !openaiKey && !geminiKey) {
      return fail(503, 'PDF generation needs AI content first. Set AI_API_KEY or GEMINI_API_KEY on the ai-generate function.', 'pdf_not_configured');
    }
    if (route.mode === 'file_analysis' && !geminiKey && !openaiKey) {
      return fail(503, 'File analysis is not configured yet. Set GEMINI_API_KEY or AI_API_KEY.', 'file_not_configured');
    }
    if (textMode && route.mode !== 'research' && textChat.provider === 'none') {
      return fail(
        503,
        'AI generation is not configured on the server yet. Set GEMINI_API_KEY or AI_API_KEY. Study Flow never stores AI API keys in the app.',
        'ai_not_configured',
      );
    }

    const run = async (onDelta?: (text: string) => void, onStatus?: (label: string) => void) => {
      let text = '';
      let sources: Source[] = [];
      let artifacts: Artifact[] = [];
      let provider = 'openai';
      let model = fastModel;
      let grounded = false;

      if (route.mode === 'research') {
        onStatus?.(loadingLabel(route.mode, route.detailLevel));
        provider = 'gemini';
        model = geminiModel;
        const result = await chatGemini({
          apiKey: geminiKey as string,
          model: geminiModel,
          system,
          packed,
          withSearch: research.withSearch,
          maxTokens: maxTokens(tier, route.mode, route.detailLevel),
          thinkingLevel: thinkingLevel(route.detailLevel),
          stream: Boolean(onDelta),
          onDelta,
        });
        text = result.answer;
        sources = sanitizeSources(
          result.chunks.map((chunk) => {
            const web = chunk && typeof chunk === 'object' ? (chunk as { web?: { uri?: string; title?: string } }).web : null;
            return { url: web?.uri, title: web?.title };
          }),
        );
        grounded = sources.length > 0;
      } else if (route.mode === 'file_analysis') {
        onStatus?.(loadingLabel(route.mode, route.detailLevel));
        if (geminiKey) {
          provider = 'gemini';
          model = geminiModel;
          const result = await chatGemini({
            apiKey: geminiKey,
            model: geminiModel,
            system,
            packed,
            attachments,
            maxTokens: maxTokens(tier, route.mode, route.detailLevel),
            thinkingLevel: thinkingLevel(route.detailLevel),
            stream: Boolean(onDelta),
            onDelta,
          });
          text = result.answer;
        } else {
          provider = 'openai';
          model = deepModel;
          text = await chatOpenAI({
            apiUrl: openaiUrl,
            apiKey: openaiKey as string,
            model,
            maxTokens: maxTokens(tier, route.mode, route.detailLevel),
            messages: chatMessages,
            stream: Boolean(onDelta),
            onDelta,
          });
        }
      } else if (route.mode === 'image') {
        onStatus?.('Generating image…');
        const topic = [...history.map((item) => item.content), prompt].join('\n').slice(-2000);
        const imagePrompt = `Educational, clear, student-friendly diagram. No logos, no watermarks. Topic:\n${topic}`;
        let bytes: Uint8Array;
        let mime = 'image/png';
        const geminiImageModel = Deno.env.get('GEMINI_IMAGE_MODEL') ?? DEFAULT_GEMINI_IMAGE_MODEL;
        if (geminiKey) {
          try {
            provider = 'gemini-image';
            model = geminiImageModel;
            const generated = await generateGeminiImage({
              apiKey: geminiKey,
              model: geminiImageModel,
              prompt: imagePrompt,
            });
            bytes = generated.bytes;
            mime = generated.mime;
          } catch (error) {
            const err = error as ProviderError;
            const details = err.details ?? {};
            const action = imageActionAfterGeminiError({
              httpStatus: typeof details.httpStatus === 'number' ? details.httpStatus : undefined,
              raw: typeof details.message === 'string' ? details.message : err.message,
              openaiImageKey: imageKey,
            });
            if (action === 'openai_fallback' && imageKey) {
              provider = 'openai-image';
              model = imageModel;
              const generated = await generateOpenAiImage({
                apiUrl: imageUrl,
                apiKey: imageKey,
                model: imageModel,
                prompt: imagePrompt,
              });
              bytes = generated.bytes;
              mime = generated.mime;
            } else if (action === 'quota_unavailable') {
              throw new ProviderError(geminiImageQuotaMessage(), 'image_quota', 502, err.details);
            } else {
              throw error;
            }
          }
        } else if (imageKey) {
          provider = 'openai-image';
          model = imageModel;
          const generated = await generateOpenAiImage({
            apiUrl: imageUrl,
            apiKey: imageKey,
            model: imageModel,
            prompt: imagePrompt,
          });
          bytes = generated.bytes;
          mime = generated.mime;
        } else {
          throw new ProviderError(
            'Image generation is not configured yet. Set IMAGE_API_KEY or GEMINI_API_KEY on the ai-generate function.',
            'image_not_configured',
            503,
          );
        }
        text = 'Here is a diagram from this conversation.';
        artifacts = [await storeArtifact(admin, userId, bytes, mime, 'leo-diagram.png', 'image')];
      } else if (route.mode === 'pdf') {
        onStatus?.('Creating your PDF…');
        provider = openaiKey ? 'openai' : 'gemini';
        model = openaiKey ? deepModel : geminiModel;
        const documentText = openaiKey
          ? await chatOpenAI({
              apiUrl: openaiUrl,
              apiKey: openaiKey,
              model: deepModel,
              maxTokens: maxTokens(tier, route.mode, route.detailLevel),
              messages: chatMessages,
            })
          : (
              await chatGemini({
                apiKey: geminiKey as string,
                model: geminiModel,
                system,
                packed,
                maxTokens: maxTokens(tier, route.mode, route.detailLevel),
                thinkingLevel: thinkingLevel(route.detailLevel),
              })
            ).answer;
        if (!documentText.trim()) {
          throw new ProviderError('PDF generation returned no document content.', 'pdf_error', 502);
        }
        const title = String(history.find((item) => item.role === 'user')?.content || prompt).slice(0, 80) || 'Study Flow notes';
        const pdfBytes = await buildStudyPdf(title, documentText);
        text = 'Your PDF is ready.';
        artifacts = [await storeArtifact(admin, userId, pdfBytes, 'application/pdf', 'leo-notes.pdf', 'pdf')];
      } else {
        onStatus?.(loadingLabel(route.mode, route.detailLevel));
        if (textChat.provider === 'openai' && openaiKey) {
          provider = 'openai';
          model = useFast ? fastModel : deepModel;
          text = await chatOpenAI({
            apiUrl: openaiUrl,
            apiKey: openaiKey,
            model,
            maxTokens: maxTokens(tier, route.mode, route.detailLevel),
            messages: chatMessages,
            stream: Boolean(onDelta),
            onDelta,
          });
        } else if (textChat.provider === 'gemini' && geminiKey) {
          provider = 'gemini';
          model = geminiModel;
          const result = await chatGemini({
            apiKey: geminiKey,
            model: geminiModel,
            system,
            packed,
            withSearch: false,
            maxTokens: maxTokens(tier, route.mode, route.detailLevel),
            thinkingLevel: thinkingLevel(route.detailLevel),
            stream: Boolean(onDelta),
            onDelta,
          });
          text = result.answer;
        } else {
          throw new ProviderError(
            'AI generation is not configured on the server yet. Set GEMINI_API_KEY or AI_API_KEY.',
            'ai_not_configured',
            503,
          );
        }
      }

      if (!text && !artifacts.length) {
        throw new ProviderError('The AI provider returned an empty response.', 'provider_error', 502);
      }

      const stored = await storeSuccess(admin, {
        userId,
        kind: storeKind,
        prompt,
        text,
        tier,
        mode: route.mode,
        detailLevel: route.detailLevel,
        grounded,
        sources,
        artifacts,
        provider,
        model,
        latency: Date.now() - started,
        conversationId: payload.conversationId ?? null,
      });

      return {
        success: true as const,
        id: stored.id,
        text,
        answer: text,
        kind: storeKind,
        responseType: responseTypeFor(route.mode),
        detailLevel: route.detailLevel,
        grounded,
        sources,
        artifacts,
        provider,
        model,
        usage: { remaining: Math.max(0, limit - used - 1), limit, used: used + 1 },
      };
    };

    if (wantsStream) {
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              controller.enqueue(sendSse('status', { label: loadingLabel(route.mode, route.detailLevel) }));
              const result = await run(
                textMode ? (delta) => controller.enqueue(sendSse('delta', { text: delta })) : undefined,
                (label) => controller.enqueue(sendSse('status', { label })),
              );
              controller.enqueue(sendSse('done', result));
              controller.close();
            } catch (error) {
              const err = error as Error & { code?: string; status?: number; details?: unknown };
              const message = (err.message || "Leo couldn't complete that request. Please try again.").replace(
                /sk-[A-Za-z0-9_-]+/g,
                '[redacted]',
              );
              controller.enqueue(
                sendSse('error', {
                  success: false,
                  error: message,
                  code: err.code ?? 'unhandled_error',
                  details: err.details,
                  responseType: 'error',
                }),
              );
              controller.close();
            }
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            ...cors,
          },
        },
      );
    }

    return json(await run());
  } catch (error) {
    const err = error as Error & { code?: string; status?: number; details?: unknown };
    const status = err.status ?? (error instanceof ProviderError ? error.status : 500);
    const code = err.code ?? 'unhandled_error';
    const message = (err.message || "Leo couldn't complete that request. Please try again.").replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]');
    return fail(status, message, code, err.details as Record<string, unknown> | undefined);
  }
});

async function storeArtifact(
  admin: ReturnType<typeof createClient>,
  userId: string,
  bytes: Uint8Array,
  mime: string,
  name: string,
  type: 'image' | 'pdf',
): Promise<Artifact> {
  const path = `${userId}/${crypto.randomUUID()}-${name}`;
  const upload = await admin.storage.from('ai-artifacts').upload(path, bytes, { contentType: mime, upsert: false });
  if (!upload.error) {
    const signed = await admin.storage.from('ai-artifacts').createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signed.data?.signedUrl) {
      return { type, name, mime, url: signed.data.signedUrl };
    }
  }
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return { type, name, mime, dataUrl: `data:${mime};base64,${btoa(binary)}` };
}

async function storeSuccess(
  admin: ReturnType<typeof createClient>,
  input: {
    userId: string;
    kind: Kind;
    prompt: string;
    text: string;
    tier: string;
    mode: AiMode;
    detailLevel: DetailLevel;
    grounded: boolean;
    sources: Source[];
    artifacts: Artifact[];
    provider: string;
    model: string;
    latency: number;
    conversationId: string | null;
  },
) {
  const row = {
    user_id: input.userId,
    kind: input.kind,
    prompt: input.prompt,
    result_text: input.text,
    result_meta: {
      tier: input.tier,
      feature: input.kind === 'leo' ? 'Leo' : input.kind === 'schedule' ? 'schedule' : 'ai-meter',
      responseType: responseTypeFor(input.mode),
      detailLevel: input.detailLevel,
      grounded: input.grounded,
      sources: input.sources,
      artifacts: input.artifacts.map(({ dataUrl: _ignored, ...artifact }) => artifact),
      provider: input.provider,
      conversationId: input.conversationId,
      status: 'success',
    },
    model: input.model,
    status: 'success',
    provider: input.provider,
    grounded: input.grounded,
    latency_ms: input.latency,
  };
  let stored = await admin.from('ai_generations').insert(row).select('id').single();
  if (stored.error && /PGRST204|42703|column/i.test(stored.error.message)) {
    const { status: _s, provider: _p, grounded: _g, latency_ms: _l, ...legacy } = row;
    stored = await admin.from('ai_generations').insert(legacy).select('id').single();
  }
  if (stored.error) {
    throw new ProviderError('Unable to store generation.', 'database_error', 500, { message: stored.error.message });
  }
  return stored.data as { id: string };
}
