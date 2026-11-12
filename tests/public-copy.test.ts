import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public billing and tester copy', () => {
  it('does not sell a trial or paid Basic on the subscription screen', () => {
    const source = readFileSync(path.resolve(__dirname, '../app/subscription.tsx'), 'utf8');
    expect(source).not.toMatch(/Start Free Trial/i);
    expect(source).not.toMatch(/15-day/i);
    expect(source).not.toMatch(/Choose Basic/i);
    expect(source).toMatch(/FREE/);
    expect(source).toMatch(/Choose Pro monthly/);
  });

  it('does not show a tester login on welcome or sign-in', () => {
    const welcome = readFileSync(path.resolve(__dirname, '../app/(auth)/welcome.tsx'), 'utf8');
    const signIn = readFileSync(path.resolve(__dirname, '../app/(auth)/sign-in.tsx'), 'utf8');
    expect(welcome).not.toMatch(/TesterAccountButton/);
    expect(signIn).not.toMatch(/TesterAccountButton/);
    expect(welcome).not.toMatch(/Tester \/ Demo/i);
  });

  it('keeps website pricing aligned with the app', () => {
    const pricing = readFileSync(path.resolve(__dirname, '../website/pricing.html'), 'utf8');
    expect(pricing).toMatch(/FREE/);
    expect(pricing).toMatch(/20 AI generations/);
    expect(pricing).toMatch(/₹299\/month/);
    expect(pricing).toMatch(/₹2,500\/year/);
    expect(pricing).not.toMatch(/15-day/);
    expect(pricing).not.toMatch(/₹99\/month/);
  });
});
