export type Plan =
  'none' | 'trial' | 'monthly';

export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'ending'
  | 'pending'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export type Task = {
  id: string;
  title: string;
  time: string;
  scheduledAt?: string | null;
  done: boolean;
  category:
    | 'study'
    | 'break'
    | 'focus';
};

export type Pricing = {
  trialPrice: number;
  trialDays: number;
  monthlyPrice: number;
  currency: string;
};

export type Session = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  language: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: string;
};