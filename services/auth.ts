import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { User as SupabaseUser } from '@supabase/supabase-js';

import {
  extractAccessTokenFromUrl,
  extractAuthCodeFromUrl,
  isAuthCallbackUrl,
} from '@/lib/auth-callback';
import { isSupabaseConfigured } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import type { UserSession } from '@/types';

WebBrowser.maybeCompleteAuthSession();

const processedCodes = new Set<string>();

export const redirectTo = () => Linking.createURL('/');

const displayNameFrom = (user: SupabaseUser) => {
  const meta = user.user_metadata ?? {};
  for (const key of ['display_name', 'full_name', 'name'] as const) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  if (user.email) return user.email.split('@')[0] ?? 'Student';
  return 'Student';
};

export function toSession(user: SupabaseUser): UserSession {
  return {
    id: user.id,
    email: user.email ?? '',
    name: displayNameFrom(user),
    role: 'user',
    plan: 'none',
    subscriptionStatus: 'none',
    entitlements: [],
  };
}

export const authService = {
  configured: isSupabaseConfigured,
  redirectTo,

  async restore(): Promise<UserSession | null> {
    if (!isSupabaseConfigured) return null;
    const { data } = await getSupabase().auth.getSession();
    return data.session?.user ? toSession(data.session.user) : null;
  },

  onAuthChange(callback: (session: UserSession | null) => void) {
    if (!isSupabaseConfigured) {
      return { data: { subscription: { unsubscribe() {} } } };
    }
    return getSupabase().auth.onAuthStateChange((_event, next) => {
      callback(next?.user ? toSession(next.user) : null);
    });
  },

  async signInWithPassword(email: string, password: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user ? toSession(data.user) : null;
  },

  async signUpWithPassword(email: string, password: string, name: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name.trim() || 'Student' },
        emailRedirectTo: redirectTo(),
      },
    });
    if (error) throw error;
    return {
      session: data.session?.user ? toSession(data.session.user) : null,
      needsVerification: !data.session,
    };
  },

  async resetPassword(email: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo(),
    });
    if (error) throw error;
  },

  async signInWithGoogle() {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const redirect = redirectTo();
    const { data, error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirect,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (!data.url) throw new Error('Google sign-in did not return a URL.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirect, {
      showInRecents: true,
    });

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { cancelled: true as const, session: null };
    }

    if (result.type === 'success' && result.url) {
      const session = await this.completeAuthCallback(result.url);
      return { cancelled: false as const, session };
    }

    return { cancelled: false as const, session: null };
  },

  async completeAuthCallback(url: string): Promise<UserSession | null> {
    if (!isSupabaseConfigured || !isAuthCallbackUrl(url)) return null;

    const code = extractAuthCodeFromUrl(url);
    if (code) {
      if (processedCodes.has(code)) {
        return this.restore();
      }
      processedCodes.add(code);
      const { data, error } = await getSupabase().auth.exchangeCodeForSession(code);
      if (error) {
        processedCodes.delete(code);
        throw error;
      }
      return data.user ? toSession(data.user) : null;
    }

    if (extractAccessTokenFromUrl(url)) {
      return this.restore();
    }

    return this.restore();
  },

  async signOut() {
    if (isSupabaseConfigured) {
      await getSupabase().auth.signOut();
    }
  },

  async deleteAccount() {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { error } = await getSupabase().functions.invoke('delete-account', {
      method: 'POST',
    });
    if (error) throw error;
  },
};
