import { describe, expect, it } from 'vitest';

import { sanitizeArtifacts } from '@/lib/ai-artifacts';
import { configuredSecret, DEFAULT_GEMINI_CHAT_MODEL, fallbackGeminiChatModel, extractGeminiText, extractGeminiTextFromStreamBody, formatGeminiProviderError, resolveGeminiChatModel, selectResearchProvider, selectTextChatProvider, SHUT_DOWN_GEMINI_CHAT_MODELS, summarizeGeminiError } from '@/lib/ai-provider';
import { packConversation } from '@/lib/ai-context';
import { DEFAULT_GEMINI_THINKING_LEVEL, geminiGenerationConfig, geminiMaxOutputTokens, geminiThinkingLevel, lengthInstruction } from '@/lib/ai-length';
import { errorFromAiFailure } from '@/lib/ai-errors';
import { classifyRequest, detectDetailLevel, isFollowUp, isTopicChange } from '@/lib/ai-router';
import { conversationForRetry } from '@/lib/ai-retry';
import { sanitizeSources, sourcesFromGrounding } from '@/lib/ai-sources';
import { parseSseBuffer, sseDeltaText } from '@/lib/ai-sse';
import type { ChatMessage } from '@/lib/ai-types';
import { remainingAllowance, shouldCountUsage, summarizeDailyUsage } from '@/lib/ai-usage';
import { AccessError, ConfigurationError } from '@/lib/errors';
import { parseFunctionsInvokeFailure } from '@/lib/functions-error';
import { canUseKind, dailyAiLimit } from '@/lib/entitlements';

const history = (topic = 'Explain quantum computing.'): ChatMessage[] => [
  { id: '1', role: 'user', content: topic, status: 'complete' },
  {
    id: '2',
    role: 'assistant',
    content: 'Quantum computing uses qubits.',
    status: 'complete',
    responseType: 'answer',
  },
];

describe('Leo routing and detail', () => {
  it('routes a simple question to a fast answer', () => {
    expect(classifyRequest('What is HTML?').mode).toBe('fast_answer');
    expect(classifyRequest('What is HTML?').needsResearch).toBe(false);
  });

  it('uses a short answer for define/brief requests', () => {
    expect(detectDetailLevel('Define photosynthesis.')).toBe('short');
    expect(detectDetailLevel('Explain this briefly.')).toBe('short');
    expect(classifyRequest('Give me only the answer.').detailLevel).toBe('short');
  });

  it('uses a balanced answer for explain', () => {
    expect(detectDetailLevel('Explain photosynthesis.')).toBe('balanced');
    expect(classifyRequest('Explain photosynthesis.').mode).toBe('fast_answer');
  });

  it('uses a detailed answer when asked or when Detailed is selected', () => {
    expect(detectDetailLevel('Explain photosynthesis in detail for my exam.')).toBe('detailed');
    expect(classifyRequest('Explain this deeply.').mode).toBe('detailed_answer');
    expect(classifyRequest('Give a complete explanation of HTML.', { preferredDetail: 'balanced' }).detailLevel).toBe(
      'detailed',
    );
    expect(classifyRequest('Explain photosynthesis.', { preferredDetail: 'detailed' }).detailLevel).toBe('detailed');
    expect(classifyRequest('Explain photosynthesis.', { preferredDetail: 'detailed' }).mode).toBe('detailed_answer');
    expect(classifyRequest('Explain simply', { preferredDetail: 'detailed' }).detailLevel).toBe('detailed');
  });

  it('lets natural language override the default selector', () => {
    expect(classifyRequest('Keep this short.', { preferredDetail: 'detailed' }).detailLevel).toBe('short');
    expect(classifyRequest('Explain in detail.', { preferredDetail: 'short' }).detailLevel).toBe('detailed');
  });

  it('detects follow-ups and pronoun references', () => {
    const prior = history();
    expect(isFollowUp('Make that simpler.', prior)).toBe(true);
    expect(isFollowUp('What are its main applications?', prior)).toBe(true);
    expect(isFollowUp('Give me an example.', prior)).toBe(true);
    expect(isFollowUp('Summarize this.', prior)).toBe(true);
    expect(isFollowUp('Expand that.', prior)).toBe(true);
    expect(classifyRequest('it', { history: prior }).mode).toBe('fast_answer');
    expect(classifyRequest('that', { history: prior }).mode).toBe('fast_answer');
    expect(classifyRequest('above', { history: prior }).mode).toBe('fast_answer');
  });

  it('continues the topic and allows a topic change', () => {
    const prior = history();
    expect(isFollowUp('Now make revision notes.', prior)).toBe(true);
    expect(classifyRequest('Now make revision notes.', { history: prior }).mode).toBe('notes');
    expect(isTopicChange('What is the capital of Japan?', prior)).toBe(true);
    expect(classifyRequest('What is the capital of Japan?', { history: prior }).needsResearch).toBe(false);
  });

  it('routes student study tasks', () => {
    expect(classifyRequest('Give me 10 MCQs on mitosis.').mode).toBe('quiz');
    expect(classifyRequest('Make flashcards.').mode).toBe('flashcards');
    expect(classifyRequest('Make this into exam notes.').mode).toBe('notes');
    expect(classifyRequest('Create a revision plan.').mode).toBe('study_plan');
  });

  it('routes research, image, pdf, and file analysis', () => {
    expect(classifyRequest('What are the latest developments in HTML?').mode).toBe('research');
    expect(classifyRequest('What are the latest developments in HTML?').needsResearch).toBe(true);
    expect(classifyRequest('Now create a diagram.', { history: history('Explain the water cycle.') }).mode).toBe(
      'image',
    );
    expect(classifyRequest('Export that as a PDF.', { history: history() }).mode).toBe('pdf');
    expect(classifyRequest('Summarize this document.', { hasAttachments: true }).mode).toBe('file_analysis');
  });
});

describe('conversation packing', () => {
  it('keeps recent turns and summarizes older ones', () => {
    const longHistory: ChatMessage[] = [];
    for (let index = 0; index < 20; index += 1) {
      longHistory.push({
        id: `u${index}`,
        role: 'user',
        content: `Question ${index} about photosynthesis and related exam material.`,
        status: 'complete',
      });
      longHistory.push({
        id: `a${index}`,
        role: 'assistant',
        content: `Answer ${index} with a short explanation.`,
        status: 'complete',
        responseType: index === 2 ? 'notes' : 'answer',
        artifacts: index === 4 ? [{ type: 'pdf', name: 'notes.pdf', mime: 'application/pdf', url: 'https://example.com/n.pdf' }] : undefined,
      });
    }
    const packed = packConversation(longHistory, 'Make it simpler.', { recentCount: 6, maxChars: 4000 });
    expect(packed.truncated).toBe(true);
    expect(packed.summary).toMatch(/Earlier in this conversation/);
    expect(packed.messages.at(-1)?.content).toBe('Make it simpler.');
    expect(packed.messages.length).toBeLessThan(longHistory.length);
  });
});

describe('sources and usage', () => {
  it('keeps only real http sources and drops fabricated values', () => {
    expect(
      sanitizeSources([
        { title: 'NASA', url: 'https://nasa.gov/water-cycle' },
        { title: 'Fake', url: 'not-a-url' },
        { title: 'Dup', url: 'https://nasa.gov/water-cycle' },
      ]),
    ).toEqual([{ title: 'NASA', url: 'https://nasa.gov/water-cycle', domain: 'nasa.gov' }]);
  });

  it('maps Gemini grounding chunks', () => {
    const sources = sourcesFromGrounding([
      { web: { uri: 'https://edu.example.edu/cell', title: 'Cell structure' } },
    ]);
    expect(sources[0]?.domain).toBe('edu.example.edu');
  });

  it('does not count failed or unstored generations', () => {
    expect(shouldCountUsage({ stored: false, success: true })).toBe(false);
    expect(shouldCountUsage({ stored: true, success: false })).toBe(false);
    expect(shouldCountUsage({ stored: true, success: true })).toBe(true);
    expect(remainingAllowance(3, 10)).toBe(7);
  });

  it('keeps subscription gating', () => {
    expect(canUseKind('free', 'leo')).toBe(false);
    expect(canUseKind('basic', 'notes')).toBe(true);
    expect(canUseKind('basic', 'leo')).toBe(false);
    expect(canUseKind('pro', 'leo')).toBe(true);
    expect(dailyAiLimit('basic')).toBe(10);
  });

  it('surfaces structured Edge Function errors including 404 and provider failure', async () => {
    const missing = await parseFunctionsInvokeFailure({
      error: { message: 'Edge Function returned a non-2xx status code', context: { status: 404 } },
      data: { code: 'NOT_FOUND', message: 'Requested function was not found' },
    });
    expect(missing.message).toMatch(/not deployed/i);

    const provider = await parseFunctionsInvokeFailure({
      error: { message: 'Edge Function returned a non-2xx status code', context: { status: 502 } },
      data: { error: 'The AI provider could not complete that request.', code: 'provider_error' },
    });
    expect(provider.code).toBe('provider_error');
    expect(provider.httpStatus).toBe(502);
  });
});

describe('artifacts, retry, streaming, and failures', () => {
  it('keeps image and PDF artifacts with safe URLs only', () => {
    const artifacts = sanitizeArtifacts([
      { type: 'image', name: 'cell.png', mime: 'image/png', url: 'https://example.com/cell.png' },
      { type: 'pdf', name: 'notes.pdf', mime: 'application/pdf', dataUrl: 'data:application/pdf;base64,AAA' },
      { type: 'image', name: 'bad.png', mime: 'image/png', url: 'javascript:alert(1)' },
      { type: 'pdf', name: 'missing.pdf', mime: 'application/pdf' },
    ]);
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0]?.type).toBe('image');
    expect(artifacts[1]?.type).toBe('pdf');
  });

  it('routes file and image context follow-ups', () => {
    const fileHistory: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Summarize this PDF.', status: 'complete' },
      { id: '2', role: 'assistant', content: 'The chapter covers mitosis and meiosis.', status: 'complete' },
    ];
    expect(classifyRequest('What are the three most important concepts?', { history: fileHistory, hasAttachments: true }).mode).toBe(
      'file_analysis',
    );
    expect(classifyRequest('Explain the second one.', { history: fileHistory, hasAttachments: true }).mode).toBe('file_analysis');
    expect(classifyRequest('Create a labeled diagram.', { history: history('Explain the structure of a cell.') }).mode).toBe('image');
    expect(classifyRequest('Make a PDF.', { history: history('Explain probability.') }).mode).toBe('pdf');
  });

  it('retries the last user prompt without forcing a retype', () => {
    const thread: ChatMessage[] = [
      ...history(),
      { id: '3', role: 'user', content: 'Give me an example.', status: 'complete' },
      { id: '4', role: 'assistant', content: '', status: 'error', error: 'provider_error' },
    ];
    const retry = conversationForRetry(thread);
    expect(retry.prompt).toBe('Give me an example.');
    expect(retry.history.some((item) => item.content === 'Give me an example.')).toBe(true);
    expect(retry.history.some((item) => item.status === 'error')).toBe(false);
    expect(retry.assistantMessageId).toBe('4');
  });

  it('parses streamed deltas and a done event', () => {
    const parsed = parseSseBuffer('event: delta\ndata: {"text":"Hello "}\n\nevent: done\ndata: {"success":true,"answer":"Hello world"}\n\n');
    expect(sseDeltaText(parsed.events[0]?.data ?? {})).toBe('Hello ');
    expect(parsed.events[1]?.event).toBe('done');
  });

  it('maps provider, search, image, PDF, network, and subscription errors', async () => {
    expect(errorFromAiFailure({ httpStatus: 502, code: 'provider_error', message: 'The AI provider could not complete that request.' })).toBeInstanceOf(
      Error,
    );
    expect(errorFromAiFailure({ httpStatus: 502, code: 'search_error', message: 'Google/Gemini research could not complete that request.' }).message).toMatch(
      /research/i,
    );
    expect(errorFromAiFailure({ httpStatus: 502, code: 'image_error', message: 'Image generation failed.' }).message).toMatch(/image/i);
    expect(errorFromAiFailure({ httpStatus: 502, code: 'pdf_error', message: 'PDF generation returned no document content.' }).message).toMatch(/pdf/i);
    expect(errorFromAiFailure({ httpStatus: 503, code: 'ai_not_configured', message: 'AI generation is not configured on the server yet.' })).toBeInstanceOf(
      ConfigurationError,
    );
    expect(errorFromAiFailure({ httpStatus: 402, code: 'payment_required', message: 'Upgrade required.' })).toBeInstanceOf(AccessError);
    expect(errorFromAiFailure({ httpStatus: 429, code: 'rate_limited', message: 'You have reached todayGÇÖs AI limit for your plan.' })).toBeInstanceOf(
      AccessError,
    );

    const network = await parseFunctionsInvokeFailure({
      error: { message: 'Failed to send a request to the Edge Function', context: { status: undefined } },
      data: null,
    });
    expect(network.message).toMatch(/request|generate|function/i);

    const structured = await parseFunctionsInvokeFailure({
      error: { message: 'Edge Function returned a non-2xx status code', context: { status: 400 } },
      data: { success: false, error: 'Invalid request.', code: 'invalid_request', responseType: 'error' },
    });
    expect(structured.code).toBe('invalid_request');
  });

  it('counts only todayGÇÖs successful generations in the AI Meter summary', () => {
    const now = new Date('2026-09-17T12:00:00Z');
    const summary = summarizeDailyUsage(
      [
        { createdAt: '2026-09-17T08:00:00Z' },
        { createdAt: '2026-09-16T08:00:00Z' },
      ],
      10,
      now,
    );
    expect(summary.used).toBe(1);
    expect(summary.remaining).toBe(9);
    expect(shouldCountUsage({ stored: false, success: false })).toBe(false);
  });
});

describe('Gemini fallback for normal Leo chat', () => {
  it('uses Gemini without Google Search when AI_API_KEY is absent', () => {
    const choice = selectTextChatProvider({ openaiKey: undefined, geminiKey: 'configured' });
    expect(choice).toEqual({ provider: 'gemini', withSearch: false });
    expect(classifyRequest('What is HTML?').needsResearch).toBe(false);
    expect(classifyRequest('Explain photosynthesis.').mode).toBe('fast_answer');
    expect(classifyRequest('Explain photosynthesis in detail for my exam.').mode).toBe('detailed_answer');
  });

  it('treats blank AI_API_KEY as missing and still falls back to Gemini', () => {
    expect(configuredSecret('   ')).toBeUndefined();
    expect(selectTextChatProvider({ openaiKey: '  ', geminiKey: 'configured' }).provider).toBe('gemini');
  });

  it('prefers OpenAI for normal chat when AI_API_KEY is present', () => {
    expect(selectTextChatProvider({ openaiKey: 'configured', geminiKey: 'configured' })).toEqual({
      provider: 'openai',
      withSearch: false,
    });
  });

  it('keeps Google Search grounding only for research', () => {
    expect(selectResearchProvider({ geminiKey: 'configured' })).toEqual({ provider: 'gemini', withSearch: true });
    const missingResearch = selectResearchProvider({ geminiKey: '' });
    expect(missingResearch.provider).toBe('none');
    if (missingResearch.provider === 'none') expect(missingResearch.code).toBe('research_not_configured');
    expect(classifyRequest('What are the latest developments in HTML?').needsResearch).toBe(true);
  });

  it('reports missing configuration when neither chat key is set', () => {
    const missing = selectTextChatProvider({ openaiKey: null, geminiKey: '' });
    expect(missing.provider).toBe('none');
    if (missing.provider === 'none') expect(missing.code).toBe('ai_not_configured');
  });

  it('does not use the shut-down gemini-2.0-flash model for "What is Html"', () => {
    expect(classifyRequest('What is Html').mode).toBe('fast_answer');
    expect(classifyRequest('What is Html').needsResearch).toBe(false);
    expect(SHUT_DOWN_GEMINI_CHAT_MODELS).toContain('gemini-2.0-flash');
    expect(resolveGeminiChatModel(undefined)).toBe('gemini-3.6-flash');
    expect(resolveGeminiChatModel('gemini-2.0-flash')).toBe('gemini-3.6-flash');
    expect(DEFAULT_GEMINI_CHAT_MODEL).toBe('gemini-3.6-flash');
    expect(selectTextChatProvider({ geminiKey: 'configured' }).withSearch).toBe(false);
  });

  it('uses gemini-3.6-flash for Gemini-only normal chat', () => {
    expect(resolveGeminiChatModel('gemini-3.6-flash')).toBe('gemini-3.6-flash');
    expect(selectTextChatProvider({ geminiKey: 'configured' }).provider).toBe('gemini');
    expect(selectTextChatProvider({ geminiKey: 'configured' }).withSearch).toBe(false);
  });

  it('retries a model-not-found error once with gemini-3.6-flash', () => {
    expect(
      fallbackGeminiChatModel(
        'gemini-2.5-flash',
        '{"error":{"code":404,"status":"NOT_FOUND","message":"model not found"}}',
      ),
    ).toBe('gemini-3.6-flash');
  });
  it('surfaces the real Gemini NOT_FOUND body instead of a generic chat failure', async () => {
    const geminiBody = JSON.stringify({
      error: {
        code: 404,
        message: 'models/gemini-2.0-flash is not found for API version v1beta, or is not supported for generateContent.',
        status: 'NOT_FOUND',
      },
    });
    expect(summarizeGeminiError(geminiBody)).toMatch(/NOT_FOUND/);
    expect(summarizeGeminiError(geminiBody)).toMatch(/gemini-2\.0-flash is not found/);
    expect(
      formatGeminiProviderError('Gemini could not complete that request.', { httpStatus: 404, message: geminiBody }),
    ).toMatch(/HTTP 404/);

    const parsed = await parseFunctionsInvokeFailure({
      error: { message: 'Edge Function returned a non-2xx status code', context: { status: 502 } },
      data: {
        success: false,
        error: 'Gemini could not complete that request.',
        code: 'provider_error',
        details: { httpStatus: 404, message: geminiBody },
      },
    });
    expect(parsed.message).toMatch(/NOT_FOUND/);
    expect(parsed.message).toMatch(/gemini-2\.0-flash/);
    expect(parsed.message).not.toMatch(/not deployed/i);
  });
});

describe('Leo response length modes', () => {
  it('instructs Short mode to stay concise without a hard word count', () => {
    const instruction = lengthInstruction('short');
    expect(instruction).toMatch(/SHORT/);
    expect(instruction).toMatch(/1-3 short paragraphs/);
    expect(instruction).not.toMatch(/\b\d+\s+words?\b/i);
    expect(classifyRequest('What is mitosis?', { preferredDetail: 'short' }).detailLevel).toBe('short');
    expect(classifyRequest('What is mitosis?', { preferredDetail: 'short' }).mode).toBe('fast_answer');
    expect(classifyRequest('What is mitosis?', { preferredDetail: 'short' }).systemDirective).toBe(instruction);
    expect(geminiMaxOutputTokens('short')).toBe(12288);
    expect(geminiThinkingLevel('short')).toBe('low');
  });

  it('instructs Balanced mode to give a normal study-assistant answer', () => {
    const instruction = lengthInstruction('balanced');
    expect(instruction).toMatch(/BALANCED/);
    expect(instruction).toMatch(/4-8 paragraphs/);
    expect(instruction).toMatch(/Do not shrink this into a short summary/);
    expect(instruction).not.toMatch(/\b\d+\s+words?\b/i);
    expect(classifyRequest('What is mitosis?', { preferredDetail: 'balanced' }).detailLevel).toBe('balanced');
    expect(classifyRequest('What is mitosis?', { preferredDetail: 'balanced' }).mode).toBe('fast_answer');
    expect(classifyRequest('What is mitosis?', { preferredDetail: 'balanced' }).systemDirective).toBe(instruction);
    expect(geminiMaxOutputTokens('balanced')).toBe(24576);
    expect(geminiThinkingLevel('balanced')).toBe(DEFAULT_GEMINI_THINKING_LEVEL);
    expect(geminiThinkingLevel('balanced')).toBe('medium');
  });

  it('instructs Detailed mode to write a thorough answer instead of a summary', () => {
    const instruction = lengthInstruction('detailed');
    expect(instruction).toMatch(/DETAILED/);
    expect(instruction).toMatch(/genuinely thorough/);
    expect(instruction).toMatch(/Do not intentionally keep the answer short/);
    expect(instruction).toMatch(/substantial answer rather than a summary/);
    expect(instruction).not.toMatch(/\b\d+\s+words?\b/i);
    expect(classifyRequest('What is mitosis?', { preferredDetail: 'detailed' }).detailLevel).toBe('detailed');
    expect(classifyRequest('What is mitosis?', { preferredDetail: 'detailed' }).mode).toBe('detailed_answer');
    expect(classifyRequest('What is mitosis?', { preferredDetail: 'detailed' }).systemDirective).toBe(instruction);
    expect(geminiMaxOutputTokens('detailed')).toBe(49152);
    expect(geminiMaxOutputTokens('balanced', 'detailed_answer')).toBe(49152);
    expect(geminiMaxOutputTokens('balanced', 'pdf')).toBe(49152);
    expect(geminiThinkingLevel('detailed')).toBe('medium');
  });

  it('treats explicit GÇ£explain in detailGÇ¥ language as Detailed even if Short is selected', () => {
    expect(detectDetailLevel('Explain photosynthesis in detail.', 'short')).toBe('detailed');
    expect(classifyRequest('Explain in detail.', { preferredDetail: 'short' }).detailLevel).toBe('detailed');
    expect(classifyRequest('Give a complete explanation of osmosis.', { preferredDetail: 'balanced' }).mode).toBe(
      'detailed_answer',
    );
    expect(classifyRequest('Teach me from beginner how DNA replication works.', { preferredDetail: 'balanced' }).detailLevel).toBe(
      'detailed',
    );
  });

  it('keeps the selected length on follow-up questions unless the user overrides it', () => {
    const prior = history();
    expect(classifyRequest('Give me an example.', { preferredDetail: 'detailed', history: prior }).detailLevel).toBe(
      'detailed',
    );
    expect(classifyRequest('What are its main applications?', { preferredDetail: 'detailed', history: prior }).mode).toBe(
      'detailed_answer',
    );
    expect(classifyRequest('Give me an example.', { preferredDetail: 'short', history: prior }).detailLevel).toBe('short');
    expect(classifyRequest('Expand that.', { preferredDetail: 'balanced', history: prior }).detailLevel).toBe('balanced');
    expect(classifyRequest('Explain that in detail.', { preferredDetail: 'short', history: prior }).detailLevel).toBe(
      'detailed',
    );
  });

  it('leaves enough maxOutputTokens for Gemini 3.x thinking plus the visible answer', () => {
    expect(geminiMaxOutputTokens('short')).toBeGreaterThanOrEqual(12288);
    expect(geminiMaxOutputTokens('balanced')).toBeGreaterThan(geminiMaxOutputTokens('short'));
    expect(geminiMaxOutputTokens('detailed')).toBeGreaterThan(geminiMaxOutputTokens('balanced'));
    expect(geminiMaxOutputTokens('detailed')).toBeLessThanOrEqual(65536);
    const config = geminiGenerationConfig(geminiMaxOutputTokens('detailed'), geminiThinkingLevel('detailed'));
    expect(config.maxOutputTokens).toBe(49152);
    expect(config.thinkingConfig.thinkingLevel).toBe('medium');
    expect(config.thinkingConfig.includeThoughts).toBe(false);
    expect(config).not.toHaveProperty('temperature');
    expect(config).not.toHaveProperty('stopSequences');
    expect(geminiGenerationConfig(12288, 'low').thinkingConfig.thinkingLevel).toBe('low');
  });
});

describe('Gemini response parser', () => {
  const thoughtAndAnswer = {
    candidates: [
      {
        content: {
          parts: [
            { thought: true, text: 'I should plan a long answer.' },
            { text: 'Visible paragraph one. ' },
            { text: 'Visible paragraph two.' },
          ],
        },
        finishReason: 'STOP',
      },
    ],
  };

  it('prefers non-thought text and concatenates long Gemini answers', () => {
    const longAnswer = Array.from({ length: 40 }, (_, index) => `Paragraph ${index + 1} about mitosis.`).join(' ');
    expect(extractGeminiText(thoughtAndAnswer)).toBe('Visible paragraph one. Visible paragraph two.');
    expect(
      extractGeminiText({
        candidates: [{ content: { parts: [{ text: longAnswer }] }, finishReason: 'STOP' }],
      }),
    ).toBe(longAnswer);
  });

  it('keeps the visible text when Gemini stops because of MAX_TOKENS', () => {
    const truncated = 'This thorough explanation was cut off mid-sentence because';
    expect(
      extractGeminiText({
        candidates: [
          {
            content: {
              parts: [{ thought: true, text: 'thinking that used many tokens' }, { text: truncated }],
            },
            finishReason: 'MAX_TOKENS',
          },
        ],
      }),
    ).toBe(truncated);
  });

  it('parses leftover SSE data and JSON-array stream bodies', () => {
    const leftover = 'data: {"candidates":[{"content":{"parts":[{"text":"Tail of the answer."}]}}]}';
    expect(extractGeminiTextFromStreamBody(leftover)).toBe('Tail of the answer.');

    const sse = [
      'data: {"candidates":[{"content":{"parts":[{"thought":true,"text":"plan"}]}}]}',
      '',
      'data: {"candidates":[{"content":{"parts":[{"text":"First chunk. "}]}}]}',
      '',
      leftover,
    ].join('\n');
    expect(extractGeminiTextFromStreamBody(sse)).toBe('First chunk. Tail of the answer.');

    const arrayBody = JSON.stringify([
      { candidates: [{ content: { parts: [{ text: 'Array part one. ' }] } }] },
      { candidates: [{ content: { parts: [{ thought: true, text: 'hidden' }, { text: 'Array part two.' }] } }] },
    ]);
    expect(extractGeminiTextFromStreamBody(arrayBody)).toBe('Array part one. Array part two.');
  });

  it('falls back to thought text only when a complete payload has no visible answer', () => {
    expect(
      extractGeminiText({
        candidates: [{ content: { parts: [{ thought: true, text: 'only thinking' }] } }],
      }).trim(),
    ).toBe('only thinking');
    expect(
      extractGeminiText(
        { candidates: [{ content: { parts: [{ thought: true, text: 'only thinking' }] } }] },
        { includeThoughtFallback: false },
      ),
    ).toBe('');
  });

  it('falls back to a non-stream generateContent payload', () => {
    expect(extractGeminiText(thoughtAndAnswer)).toContain('Visible paragraph');
    expect(extractGeminiTextFromStreamBody(JSON.stringify(thoughtAndAnswer))).toBe(
      'Visible paragraph one. Visible paragraph two.',
    );
  });
});
