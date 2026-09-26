import type { AiKind } from '@/types';

export type DetailLevel = 'short' | 'balanced' | 'detailed';

export type AiMode =
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

export type AiResponseType =
  | 'answer'
  | 'research'
  | 'image'
  | 'pdf'
  | 'notes'
  | 'quiz'
  | 'study_plan'
  | 'error';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  responseType?: AiResponseType;
  detailLevel?: DetailLevel;
  grounded?: boolean;
  sources?: AiSource[];
  artifacts?: AiArtifact[];
  error?: string;
  generationId?: string;
};

export type AiSource = {
  title: string;
  url: string;
  domain?: string;
};

export type AiArtifact = {
  type: 'image' | 'pdf';
  name: string;
  mime: string;
  url?: string;
  dataUrl?: string;
};

export type AiAttachment = {
  name: string;
  mime: string;
  kind: 'image' | 'pdf' | 'text';
  dataBase64: string;
};

export type RouteDecision = {
  mode: AiMode;
  detailLevel: DetailLevel;
  needsResearch: boolean;
  needsImage: boolean;
  needsPdf: boolean;
  kindHint: AiKind;
  loadingLabel: string;
  systemDirective: string;
};

export type PackedContext = {
  messages: Array<{ role: ChatRole; content: string }>;
  summary?: string;
  truncated: boolean;
};

export type GenerateSuccess = {
  success: true;
  id: string;
  text: string;
  kind: AiKind;
  answer: string;
  responseType: AiResponseType;
  detailLevel: DetailLevel;
  grounded: boolean;
  sources: AiSource[];
  artifacts: AiArtifact[];
  usage?: { remaining: number; limit: number; used: number };
  provider?: string;
  model?: string;
};

export type GenerateFailure = {
  success: false;
  error: string;
  code?: string;
  responseType: 'error';
};
