export type Plan = 'none' | 'trial' | 'basic' | 'pro' | 'monthly';

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

export type TaskCategory = 'study' | 'break' | 'focus';

export type Task = {
  id: string;
  title: string;
  time: string;
  scheduledAt?: string | null;
  done: boolean;
  category: TaskCategory;
};

export type Pricing = {
  trialPrice: number;
  trialDays: number;
  monthlyPrice: number;
  yearlyPrice: number;
  proMonthlyPrice: number;
  proYearlyPrice: number;
  currency: string;
};

export type UserSettings = {
  language: string;
  theme: 'light' | 'dark' | 'system';
  focusMode: 'balanced' | 'pomodoro' | 'deep';
  notificationsEnabled: boolean;
  studyReminders: boolean;
  goalReminders: boolean;
  aiContextEnabled: boolean;
  focusMinutes: number;
};

export type Session = {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: 'user' | 'admin';
  language: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: string;
  productId?: string;
  willRenew?: boolean;
};

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

export type AiGeneration = {
  id: string;
  kind: AiKind;
  prompt: string;
  resultText: string;
  createdAt: string;
  tokensUsed?: number | null;
};

export type FocusSession = {
  id?: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
};

export type AchievementId =
  | 'first_focus'
  | 'streak_3'
  | 'streak_7'
  | 'tasks_10'
  | 'goal_complete'
  | 'study_5h';

export type Achievement = {
  id: AchievementId;
  earned: boolean;
  earnedAt?: string;
};
