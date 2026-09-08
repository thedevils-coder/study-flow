import { describe, expect, it, vi } from 'vitest';
import { trialTiming } from '../services/trial';
import { readFileSync } from 'node:fs';

describe('Study Flow pricing', () => {
  it('uses a fifteen-day free trial and ₹99 monthly default', () => {
    const pricingSource=readFileSync('services/pricing.ts','utf8');
    expect(pricingSource).toContain("trialPrice:0, trialDays:15, monthlyPrice:99, currency:'INR'");
  });
  it('calculates remaining trial days from the provider expiration date', () => {
    vi.setSystemTime(new Date('2026-08-01T00:00:00Z'));
    expect(trialTiming('2026-08-16T00:00:00Z')).toMatchObject({ daysRemaining: 15 });
    vi.useRealTimers();
  });
});
