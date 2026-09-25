import type { AiKind } from '@/types';

import type { AiMode, ChatMessage, DetailLevel, RouteDecision } from '@/lib/ai-types';

import { lengthInstruction } from '@/lib/ai-length';

const SHORT_RE =
  /\b(briefly|short|quick answer|only the answer|just the answer|in one sentence|tl;dr|tldr|concise|summarize this briefly)\b/i;
const DETAILED_RE =
  /\b(in detail|detailed|deeply|full explanation|complete explanation|exam notes|revision notes|step by step|step-by-step|teach me from beginner|comprehensive|long answer|in depth|in-depth|thoroughly)\b/i;

const RESEARCH_RE =
  /\b(latest|current|recent|today|this year|202[5-9]|developments?|news|statistics?|verify|according to (?:sources|research)|look up|search|google|what(?:'|’)s new)\b/i;

const IMAGE_RE =
  /\b(create|generate|make|draw|visualize|design)\b.{0,40}\b(image|picture|illustration|diagram|visual|infographic|labeled diagram)\b|\b(diagram|illustration|infographic|visualize this)\b/i;

const PDF_RE =
  /\b(pdf|worksheet|revision guide|export that|export this|turn (?:this|that|it) into a (?:pdf|document)|make a report)\b/i;

const QUIZ_RE = /\b(quiz|mcqs?|multiple[- ]choice|practice questions?|test me|quiz me)\b/i;
const FLASH_RE = /\b(flashcards?)\b/i;
const NOTES_RE = /\b(revision notes|exam notes|study notes|make notes|detailed notes|turn this into notes)\b/i;
const PLAN_RE = /\b(study plan|revision plan|revision schedule|timetable|study schedule)\b/i;
const FOLLOW_UP_RE =
  /\b(it|its|this|that|these|those|above|previous|the topic|the example|the first one|the second one|make it|make that|expand that|summarize (?:this|that|those)|give me an example)\b/i;

export function detectDetailLevel(prompt: string, fallback: DetailLevel = 'balanced'): DetailLevel {
  const text = prompt.trim();
  if (SHORT_RE.test(text) && !DETAILED_RE.test(text)) return 'short';
  if (/\bdefine\b/i.test(text) && !DETAILED_RE.test(text) && text.split(/\s+/).length < 12) return 'short';
  if (DETAILED_RE.test(text)) return 'detailed';
  return fallback;
}

export function isFollowUp(prompt: string, history: Pick<ChatMessage, 'role' | 'content'>[]) {
  if (!history.length) return false;
  const text = prompt.trim();
  if (text.length < 80 && FOLLOW_UP_RE.test(text)) return true;
  if (/^(and|also|now|what about|how about)\b/i.test(text)) return true;
  return false;
}

export function isTopicChange(prompt: string, history: Pick<ChatMessage, 'role' | 'content'>[]) {
  if (!history.length) return false;
  if (isFollowUp(prompt, history)) return false;
  return prompt.trim().split(/\s+/).length > 3 && !FOLLOW_UP_RE.test(prompt);
}

export function classifyRequest(
  prompt: string,
  options: {
    preferredDetail?: DetailLevel;
    history?: Pick<ChatMessage, 'role' | 'content'>[];
    hasAttachments?: boolean;
  } = {},
): RouteDecision {
  const text = prompt.trim();
  const history = options.history ?? [];
  const detailLevel = detectDetailLevel(text, options.preferredDetail ?? 'balanced');
  const followUp = isFollowUp(text, history);

  const needsImage = IMAGE_RE.test(text);
  const needsPdf = PDF_RE.test(text);
  const needsResearch = RESEARCH_RE.test(text) && !needsImage && !needsPdf;
  const quiz = QUIZ_RE.test(text);
  const flash = FLASH_RE.test(text);
  const notes = NOTES_RE.test(text) || (followUp && /\bnotes\b/i.test(text));
  const plan = PLAN_RE.test(text);
  const fileAnalysis = Boolean(options.hasAttachments) && !needsImage && !needsPdf;

  let mode: AiMode = 'fast_answer';
  let kindHint: AiKind = 'leo';
  let loadingLabel = 'Leo is thinking…';

  if (needsImage) {
    mode = 'image';
    loadingLabel = 'Generating image…';
  } else if (needsPdf) {
    mode = 'pdf';
    loadingLabel = 'Creating your PDF…';
  } else if (fileAnalysis) {
    mode = 'file_analysis';
    loadingLabel = 'Reading your material…';
  } else if (needsResearch) {
    mode = 'research';
    loadingLabel = 'Checking current sources…';
  } else if (plan) {
    mode = 'study_plan';
    kindHint = 'schedule';
    loadingLabel = 'Building a study plan…';
  } else if (quiz) {
    mode = 'quiz';
    kindHint = 'quiz';
    loadingLabel = 'Writing practice questions…';
  } else if (flash) {
    mode = 'flashcards';
    kindHint = 'flashcards';
    loadingLabel = 'Making flashcards…';
  } else if (notes) {
    mode = 'notes';
    kindHint = 'notes';
    loadingLabel = 'Writing notes…';
  } else if (detailLevel === 'detailed') {
    mode = 'detailed_answer';
    loadingLabel = 'Preparing a detailed answer…';
  } else {
    mode = 'fast_answer';
    loadingLabel = detailLevel === 'short' ? 'Finding a short answer…' : 'Leo is thinking…';
  }

  return {
    mode,
    detailLevel,
    needsResearch,
    needsImage,
    needsPdf,
    kindHint,
    loadingLabel,
    systemDirective: directiveFor(mode, detailLevel),
  };
}

export function directiveFor(mode: AiMode, detailLevel: DetailLevel) {
  const length = lengthInstruction(detailLevel);

  if (mode === 'image') {
    return 'Create a precise educational image prompt from the conversation topic. Do not invent a different subject.';
  }
  if (mode === 'pdf') {
    return 'Write a well-structured study document: title, headings, short paragraphs, bullets and page-friendly sections. Use the conversation topic. Do not invent sources.';
  }
  if (mode === 'research') {
    return `${length} Use current web research. Cite only real sources returned by grounding. If sources disagree, say so. Never fabricate URLs.`;
  }
  if (mode === 'quiz') {
    return 'Create a short quiz with answers after the questions. Stay on the current topic.';
  }
  if (mode === 'flashcards') {
    return 'Create concise question/answer flashcards on the current topic.';
  }
  if (mode === 'notes') {
    return 'Write structured revision notes with headings and short bullets. Stay on the current topic.';
  }
  if (mode === 'study_plan') {
    return 'Propose a realistic study plan. If returning tasks, use a JSON array of {title, scheduledAt, minutes, reason}.';
  }
  if (mode === 'file_analysis') {
    return `${length} Use the attached study material as the primary source. Do not replace it with unrelated content.`;
  }
  return length;
}

export function shouldUseFastModel(mode: AiMode, detailLevel: DetailLevel) {
  return mode === 'fast_answer' && detailLevel !== 'detailed';
}

export function loadingLabelFor(mode: AiMode) {
  return classifyRequest(mode === 'image' ? 'create a diagram' : mode === 'pdf' ? 'make a pdf' : 'explain this')
    .loadingLabel;
}
