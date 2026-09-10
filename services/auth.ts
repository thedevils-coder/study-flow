import { Session } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  extractAccessTokenFromUrl,
  extractAuthCodeFromUrl,
  isAuthCallbackUrl,
} from '@/lib/auth-callback';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = () => Linking.createURL('/');

/**
 * Phone OTP is implemented but off for launch so Study Flow does not
 * depend on Twilio or any paid SMS provider. Flip this to true when
 * an SMS provider is configured in Supabase Auth.
 */
export const PHONE_AUTH_ENABLED = false;

const displayNameFrom = (user: {
  email?: string;
  phone?: string;
  user_metadata?: Record<string, unknown>;
}) => {
  const meta = user.user_metadata ?? {};
  if (typeof meta.display_name === 'string' && meta.display_name.trim()) {
    return meta.display_name.trim();
  }
  if (typeof meta.full_name === 'string' && meta.full_name.trim()) {
    return meta.full_name.trim();
  }
  if (typeof meta.name === 'string' && meta.name.trim()) {
    return meta.name.trim();
  }
  if (user.email) {
    return user.email.split('@')[0] ?? 'Student';
  }
  return 'Student';
};

export function toSession(user: {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, unknown>;
}): Session {
  return {
    id: user.id,
    email: user.email ?? '',
    phone: user.phone,
    name: displayNameFrom(user),
    role: 'user',
    language: 'en',
    plan: 'none',
    subscriptionStatus: 'none',
  };
}

export const auth = {
  configured: isSupabaseConfigured,

  redirectTo,

  async restore(): Promise<Session | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    const { data } = await getSupabase().auth.getSession();
    return data.session ? toSession(data.session.user) : null;
  },

  onAuthChange(callback: (session: Session | null) => void) {
    if (!isSupabaseConfigured) {
      return { data: { subscription: { unsubscribe() {} } } };
    }

    return getSupabase().auth.onAuthStateChange((_event, next) => {
      callback(next?.user ? toSession(next.user) : null);
    });
  },

  async sendMagicLink(email: string, name: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: {
        data: { display_name: name },
        emailRedirectTo: redirectTo(),
      },
    });

    if (error) {
      throw error;
    }
  },

  async signInWithPassword(email: string, password: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data.user ? toSession(data.user) : null;
  },

  async signUpWithPassword(email: string, password: string, name: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: redirectTo(),
      },
    });

    if (error) {
      throw error;
    }

    return data.user ? toSession(data.user) : null;
  },

  async resetPassword(email: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo(),
    });

    if (error) {
      throw error;
    }
  },

  async sendPhoneCode(phone: string) {
    if (!PHONE_AUTH_ENABLED) {
      throw new Error('Phone sign-in is not enabled for this launch.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await getSupabase().auth.signInWithOtp({ phone });

    if (error) {
      throw error;
    }
  },

  async verifyPhoneCode(phone: string, token: string) {
    if (!PHONE_AUTH_ENABLED) {
      throw new Error('Phone sign-in is not enabled for this launch.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await getSupabase().auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      throw error;
    }

    return data.user ? toSession(data.user) : null;
  },

  async signInWithGoogle() {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const redirect = redirectTo();
    const { data, error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirect,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    if (!data.url) {
      throw new Error('Google sign-in did not return a URL.');
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirect, {
      showInRecents: true,
    });

    if (result.type === 'success' && result.url) {
      return this.completeMagicLink(result.url);
    }

    return null;
  },

  /**
   * Completes PKCE (and email magic-link) return URLs by exchanging `code`.
   * Used for both in-app WebBrowser results and Linking cold/warm starts.
   */
  async completeMagicLink(url: string): Promise<Session | null> {
    if (!isSupabaseConfigured || !isAuthCallbackUrl(url)) {
      return null;
    }

    const code = extractAuthCodeFromUrl(url);

    if (code) {
      const { data, error } = await getSupabase().auth.exchangeCodeForSession(code);

      if (error) {
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
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await getSupabase().functions.invoke('delete-account', {
      method: 'POST',
    });

    if (error) {
      throw error;
    }
  },
};
