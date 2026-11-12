import { describe, expect, it } from 'vitest';

import { extractAuthCodeFromUrl, isAuthCallbackUrl } from '@/lib/auth-callback';

describe('auth callback', () => {
  it('reads PKCE codes from custom-scheme URLs', () => {
    expect(extractAuthCodeFromUrl('studyflow://?code=abc123')).toBe('abc123');
    expect(extractAuthCodeFromUrl('studyflow:///?code=abc123')).toBe('abc123');
    expect(isAuthCallbackUrl('studyflow://auth?code=abc123')).toBe(true);
    expect(isAuthCallbackUrl('studyflow://home')).toBe(false);
  });
});
