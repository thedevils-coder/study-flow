import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';

import { getTier } from '@/lib/entitlements';
import { isAuthCallbackUrl } from '@/lib/auth-callback';
import { isSupabaseConfigured } from '@/lib/config';
import { authService } from '@/services/auth';
import { hydrateProfile } from '@/services/profile';
import { testerService } from '@/services/tester';
import {
  configurePurchases,
  customerInfo,
  purchaseProduct,
  restorePurchases,
  type SubscriptionSnapshot,
} from '@/services/subscriptions';
import { applyTesterDemoAccess, isTesterBuildEnabled, isTesterEmail } from '@/lib/tester';
import type { ProductId, SubscriptionTier, UserSession } from '@/types';

type AuthContextValue = {
  session: UserSession | null;
  ready: boolean;
  configured: boolean;
  tier: SubscriptionTier;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ needsVerification: boolean }>;
  signInTester: () => Promise<void>;
  signInWithGoogle: () => Promise<{ cancelled: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  purchase: (productId: ProductId) => Promise<void>;
  restore: () => Promise<void>;
  applySubscription: (snapshot: SubscriptionSnapshot) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [ready, setReady] = useState(false);
  const establishing = useRef(false);
  const handledUrls = useRef(new Set<string>());

  const applySubscription = useCallback((snapshot: SubscriptionSnapshot) => {
    setSession((current) => (current ? applyTesterDemoAccess({ ...current, ...snapshot }) : current));
  }, []);

  const establish = useCallback(async (seed: UserSession) => {
    establishing.current = true;
    try {
      if (isTesterBuildEnabled() && isTesterEmail(seed.email)) {
        await testerService.ensureSeeded(seed).catch(() => undefined);
      }
      const profile = await hydrateProfile(seed);
      try {
        await configurePurchases(profile.id);
      } catch {
        // Purchases are optional in Expo Go / unconfigured builds.
      }
      try {
        const sub = await customerInfo();
        setSession(applyTesterDemoAccess({ ...profile, ...sub }));
      } catch {
        setSession(applyTesterDemoAccess(profile));
      }
    } finally {
      establishing.current = false;
    }
  }, []);

  useEffect(() => {
    let live = true;

    const fromUrl = async (url: string) => {
      if (!isAuthCallbackUrl(url) || handledUrls.current.has(url)) return;
      handledUrls.current.add(url);
      const signedIn = await authService.completeAuthCallback(url);
      if (signedIn && live) await establish(signedIn);
    };

    authService
      .restore()
      .then(async (current) => {
        if (current && live) await establish(current);
        const initial = await Linking.getInitialURL();
        if (initial) await fromUrl(initial);
      })
      .finally(() => live && setReady(true));

    const linking = Linking.addEventListener('url', (event) => {
      fromUrl(event.url).catch(() => undefined);
    });

    const authSub = authService.onAuthChange((next) => {
      if (!next) {
        setSession(null);
        return;
      }
      if (!establishing.current) {
        void establish(next);
      }
    });

    return () => {
      live = false;
      linking.remove();
      authSub.data.subscription.unsubscribe();
    };
  }, [establish]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      configured: isSupabaseConfigured,
      tier: getTier(session),
      applySubscription,

      async signIn(email, password) {
        const next = await authService.signInWithPassword(email.trim(), password);
        if (next) await establish(next);
      },

      async signInTester() {
        const next = await testerService.signIn();
        try {
          await testerService.ensureSeeded(next);
        } catch (error) {
          await establish(next);
          throw error;
        }
        await establish(next);
      },

      async signUp(email, password, name) {
        const result = await authService.signUpWithPassword(email.trim(), password, name);
        if (result.session) await establish(result.session);
        return { needsVerification: result.needsVerification };
      },

      async signInWithGoogle() {
        const result = await authService.signInWithGoogle();
        if (result.session) await establish(result.session);
        return { cancelled: result.cancelled };
      },

      async resetPassword(email) {
        await authService.resetPassword(email.trim());
      },

      async signOut() {
        await authService.signOut();
        setSession(null);
      },

      async deleteAccount() {
        await authService.deleteAccount();
        setSession(null);
      },

      async refreshSubscription() {
        if (!session) return;
        applySubscription(await customerInfo());
      },

      async purchase(productId) {
        applySubscription(await purchaseProduct(productId));
      },

      async restore() {
        applySubscription(await restorePurchases());
      },
    }),
    [session, ready, establish, applySubscription],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing.');
  return value;
}
