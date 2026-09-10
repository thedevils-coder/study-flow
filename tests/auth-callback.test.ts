import { describe, expect, it } from 'vitest';
import {
  extractAuthCodeFromUrl,
  extractAccessTokenFromUrl,
  isAuthCallbackUrl,
} from '@/lib/auth-callback';

describe('OAuth / magic-link callback parsing', () => {
  it('reads a PKCE code from studyflow:///?code=', () => {
    expect(extractAuthCodeFromUrl('studyflow:///?code=pkce-one')).toBe('pkce-one');
    expect(isAuthCallbackUrl('studyflow:///?code=pkce-one')).toBe(true);
  });

  it('reads a PKCE code from studyflow://?code=', () => {
    expect(extractAuthCodeFromUrl('studyflow://?code=pkce-two')).toBe('pkce-two');
    expect(isAuthCallbackUrl('studyflow://?code=pkce-two')).toBe(true);
  });

  it('reads a code from Expo Go deep links', () => {
    expect(
      extractAuthCodeFromUrl('exp://192.168.1.20:8081/--/?code=expo-code&other=1'),
    ).toBe('expo-code');
  });

  it('ignores unrelated URLs', () => {
    expect(extractAuthCodeFromUrl('studyflow:///planner')).toBeNull();
    expect(isAuthCallbackUrl('studyflow:///')).toBe(false);
    expect(extractAuthCodeFromUrl(null)).toBeNull();
  });

  it('reads implicit access tokens from the hash when present', () => {
    expect(
      extractAccessTokenFromUrl('studyflow:///#access_token=tok&token_type=bearer'),
    ).toBe('tok');
  });
});
