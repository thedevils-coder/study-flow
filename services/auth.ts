import { Session } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import * as Linking from 'expo-linking';

const redirectTo = () => Linking.createURL('/');

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
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await getSupabase().auth.signInWithOtp({ phone });

    if (error) {
      throw error;
    }
  },

  async verifyPhoneCode(phone: string, token: string) {
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

    const { data, error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo(),
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    if (data.url) {
      await Linking.openURL(data.url);
    }

    return data;
  },

  async completeMagicLink(url: string): Promise<Session | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');

    if (!code) {
      const accessToken = parsed.hash
        .replace(/^#/, '')
        .split('&')
        .find((part) => part.startsWith('access_token='))
        ?.split('=')[1];

      if (!accessToken) {
        return this.restore();
      }
    } else {
      const { data, error } = await getSupabase().auth.exchangeCodeForSession(code);

      if (error) {
        throw error;
      }

      return data.user ? toSession(data.user) : null;
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
