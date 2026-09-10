import { describe, expect, it, vi } from 'vitest';
import { trialTiming } from '@/services/trial';
import { defaultPricing } from '@/services/pricing';
import { calculateStreak } from '@/lib/streak';
import { getTier, canUseKind, dailyAiLimit, normalizePlan } from '@/lib/entitlements';
import { en } from '@/i18n/en';
import { t, validateLocales, missingKeys, languages } from '@/i18n';
import { isOverdue, sortByScheduledAt, combineDateAndTime } from '@/lib/dates';
import { aiErrorCopyKey } from '@/lib/ai-errors';

describe('Study Flow pricing', () => {
  it('uses a fifteen-day free trial and ₹99 monthly default', () => {
    expect(defaultPricing.trialPrice).toBe(0);
    expect(defaultPricing.trialDays).toBe(15);
    expect(defaultPricing.monthlyPrice).toBe(99);
    expect(defaultPricing.yearlyPrice).toBe(1000);
    expect(defaultPricing.proMonthlyPrice).toBe(299);
    expect(defaultPricing.proYearlyPrice).toBe(2500);
    expect(defaultPricing.currency).toBe('INR');
  });

  it('calculates remaining trial days from the provider expiration date', () => {
    vi.setSystemTime(new Date('2026-08-01T00:00:00Z'));
    expect(trialTiming('2026-08-16T00:00:00Z')).toMatchObject({ daysRemaining: 15 });
    vi.useRealTimers();
  });
});

describe('streaks', () => {
  it('counts today and consecutive previous days', () => {
    vi.setSystemTime(new Date('2026-09-10T12:00:00'));
    expect(calculateStreak(['2026-09-08', '2026-09-09', '2026-09-10'])).toEqual({
      current: 3,
      longest: 3,
    });
    vi.useRealTimers();
  });

  it('keeps yesterday alive if today is missing', () => {
    vi.setSystemTime(new Date('2026-09-10T12:00:00'));
    expect(calculateStreak(['2026-09-09']).current).toBe(1);
    vi.useRealTimers();
  });

  it('resets after a missed day', () => {
    vi.setSystemTime(new Date('2026-09-10T12:00:00'));
    expect(calculateStreak(['2026-09-07', '2026-09-08']).current).toBe(0);
    vi.useRealTimers();
  });
});

describe('entitlements', () => {
  it('maps legacy monthly plan to basic', () => {
    expect(normalizePlan('monthly')).toBe('basic');
  });

  it('gates flashcards, Leo and Schedule Maker to Pro or trial', () => {
    expect(canUseKind('basic', 'notes')).toBe(true);
    expect(canUseKind('basic', 'flashcards')).toBe(false);
    expect(canUseKind('basic', 'leo')).toBe(false);
    expect(canUseKind('basic', 'schedule')).toBe(false);
    expect(canUseKind('pro', 'quiz')).toBe(true);
    expect(canUseKind('pro', 'leo')).toBe(true);
    expect(canUseKind('trial', 'leo')).toBe(true);
    expect(canUseKind('free', 'leo')).toBe(false);
  });

  it('applies server-side daily limits by tier', () => {
    expect(dailyAiLimit('free')).toBe(0);
    expect(dailyAiLimit('trial')).toBe(10);
    expect(dailyAiLimit('pro')).toBe(80);
  });

  it('treats an active trial session as trial', () => {
    expect(
      getTier({
        id: '1',
        email: 'a@b.c',
        name: 'A',
        role: 'user',
        language: 'en',
        plan: 'trial',
        subscriptionStatus: 'active',
        trialEndsAt: '2099-01-01T00:00:00Z',
      }),
    ).toBe('trial');
  });
});

describe('i18n', () => {
  it('has no empty English strings', () => {
    expect(Object.values(en).every((value) => value.trim().length > 0)).toBe(true);
  });

  it('falls back to English', () => {
    expect(t('unknown', 'aiMeter')).toBe('AI Meter');
    expect(t('en', 'leo')).toBe('Leo');
  });

  it('completes every locale for every English key', () => {
    expect(validateLocales()).toEqual([]);
    expect(missingKeys('en')).toEqual([]);
    for (const [code] of languages.filter(([item]) => item !== 'en')) {
      expect(missingKeys(code)).toEqual([]);
    }
    expect(t('hi', 'editGoal')).not.toBe('Edit goal');
    expect(t('hi', 'deleteGoal')).not.toBe('Delete goal');
    expect(t('es', 'legalPrivacyBody').length).toBeGreaterThan(40);
    expect(t('ja', 'balanced')).not.toBe('Balanced');
  });

  it('interpolates values and never shows a raw key for known copy', () => {
    expect(t('en', 'brandName')).toBe('Study Flow');
    expect(t('en', 'aiMeter', { unused: 1 })).toBe('AI Meter');
  });
});

describe('tasks', () => {
  it('marks incomplete past tasks overdue', () => {
    expect(isOverdue('2000-01-01T00:00:00Z', false)).toBe(true);
    expect(isOverdue('2000-01-01T00:00:00Z', true)).toBe(false);
  });

  it('orders scheduled tasks by time and keeps unscheduled last', () => {
    const ordered = sortByScheduledAt([
      { scheduledAt: '2026-09-10T18:00:00Z' },
      { scheduledAt: null },
      { scheduledAt: '2026-09-10T08:00:00Z' },
    ]);
    expect(ordered.map((item) => item.scheduledAt)).toEqual([
      '2026-09-10T08:00:00Z',
      '2026-09-10T18:00:00Z',
      null,
    ]);
  });

  it('combines date and time in local time without UTC conversion', () => {
    const date = new Date(2026, 8, 10, 0, 0, 0, 0);
    const combined = combineDateAndTime(date, 18, 30);
    expect(combined.getFullYear()).toBe(2026);
    expect(combined.getMonth()).toBe(8);
    expect(combined.getDate()).toBe(10);
    expect(combined.getHours()).toBe(18);
    expect(combined.getMinutes()).toBe(30);
  });
});

describe('AI errors', () => {
  it('maps known server errors onto translation keys', () => {
    expect(aiErrorCopyKey(new Error('AI generation is not configured on the server yet.'))).toBe(
      'aiUnavailable',
    );
    expect(aiErrorCopyKey(new Error('This tool is included with Study Flow Pro.'))).toBe('proFeature');
    expect(aiErrorCopyKey(new Error('Start a free trial or choose Basic to use AI Meter.'))).toBe(
      'aiNeedsPlan',
    );
    expect(t('hi', aiErrorCopyKey(new Error('Sign in required.')))).not.toBe('sessionExpired');
  });
});
