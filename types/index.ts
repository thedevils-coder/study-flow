export type Role = 'user' | 'admin';

export type Plan = 'none' | 'trial' | 'basic' | 'pro';

export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'ending'
  | 'pending'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export type SubscriptionTier = 'free' | 'trial' | 'basic' | 'pro';

export type ThemePreference = 'system' | 'light' | 'dark';

export type TaskCategory = 'study' | 'break' | 'focus';

export type SessionType = 'focus' | 'short_break' | 'long_break';

export type ProductId =
  | 'studyflow_basic_monthly'
  | 'studyflow_basic_yearly'
  | 'studyflow_pro_monthly'
  | 'studyflow_pro_yearly';

export type AiKind =
  | 'notes'
  | 'summary'
  | 'flashcards'
  | 'quiz'
  | 'explain'
  | 'leo'
  | 'schedule'
  | 'other';

export type AchievementId =
  | 'first_focus'
  | 'study_starter'
  | 'consistent'
  | 'focus_master'
  | 'goal_crusher';

export type UserSession = {
  id: string;
  email: string;
  name: string;
  role: Role;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: string | null;
  productId?: string | null;
  willRenew?: boolean;
  entitlements: string[];
};

export type Task = {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  scheduledAt: string | null;
  category: TaskCategory;
  createdAt: string;
  updatedAt: string;
};

export type StudyGoal = {
  id: string;
  userId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FocusSession = {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  sessionType: SessionType;
  createdAt: string;
};

export type UserSettings = {
  userId: string;
  theme: ThemePreference;
  notificationsEnabled: boolean;
  studyReminders: boolean;
  taskReminders: boolean;
  goalReminders: boolean;
  focusMinutes: number;
  updatedAt: string;
};

export type AiActivity = {
  id: string;
  userId: string;
  kind: AiKind;
  prompt: string;
  resultText: string;
  summary: string;
  createdAt: string;
  relatedFeature: string;
};

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: string | null;
};

export type Pricing = {
  trialDays: number;
  basicMonthly: number;
  basicYearly: number;
  proMonthly: number;
  proYearly: number;
  currency: string;
};

export type ProposedTask = {
  title: string;
  scheduledAt: string;
  minutes?: number;
  reason?: string;
};

export type ScheduleDraft = {
  title: string;
  tasks: ProposedTask[];
  notes: string;
};
