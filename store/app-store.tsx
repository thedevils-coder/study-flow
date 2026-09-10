import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { I18nManager } from 'react-native';
import * as Linking from 'expo-linking';
import { AiGeneration, Session, Task, TaskCategory, UserSettings } from '@/types';
import { auth } from '@/services/auth';
import { extractAuthCodeFromUrl, isAuthCallbackUrl } from '@/lib/auth-callback';
import { configurePurchases, customerInfo } from '@/services/subscriptions';
import { hydrateProfile } from '@/services/profile';
import { defaultSettings, studyData, StudyGoal } from '@/services/study-data';
import { addDays, startOfDay } from '@/lib/dates';
import { calculateStreak } from '@/lib/streak';

type Store = {
  session: Session | null;
  ready: boolean;
  tasks: Task[];
  goals: StudyGoal[];
  settings: UserSettings;
  streak: { current: number; longest: number };
  aiHistory: AiGeneration[];
  requestSignIn: (email: string, name?: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPhoneCode: (phone: string) => Promise<void>;
  verifyPhoneCode: (phone: string, token: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
  saveSettings: (patch: Partial<UserSettings>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  addTask: (title: string, scheduledAt: string | null, category?: TaskCategory) => Promise<void>;
  updateTask: (
    id: string,
    patch: { title?: string; scheduledAt?: string | null; category?: TaskCategory },
  ) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addGoal: (title: string, targetValue: number, unit?: string, dueAt?: string | null) => Promise<void>;
  updateGoalProgress: (id: string, currentValue: number) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  recordFocus: (startedAt: Date, seconds: number) => Promise<void>;
  refreshAiHistory: () => Promise<void>;
  deleteAiGeneration: (id: string) => Promise<void>;
  refreshStreak: () => Promise<void>;
};

const C = createContext<Store | null>(null);

const emptyUserState = () => ({
  tasks: [] as Task[],
  goals: [] as StudyGoal[],
  settings: defaultSettings(),
  streak: { current: 0, longest: 0 },
  aiHistory: [] as AiGeneration[],
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings());
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [aiHistory, setAiHistory] = useState<AiGeneration[]>([]);
  const userIdRef = useRef<string | null>(null);

  const clearUserData = useCallback(() => {
    userIdRef.current = null;
    setSession(null);
    const empty = emptyUserState();
    setTasks(empty.tasks);
    setGoals(empty.goals);
    setSettings(empty.settings);
    setStreak(empty.streak);
    setAiHistory(empty.aiHistory);
  }, []);

  const loadWorkspace = useCallback(async (userId: string) => {
    const today = startOfDay(new Date());
    const [nextTasks, nextGoals, nextSettings, days, history] = await Promise.all([
      studyData.tasks(userId),
      studyData.goals(userId),
      studyData.settings(userId),
      studyData.activityDays(userId, addDays(today, -400), addDays(today, 1)),
      studyData.aiHistory(userId),
    ]);

    setTasks(nextTasks);
    setGoals(nextGoals);
    setSettings(nextSettings);
    setStreak(calculateStreak(days));
    setAiHistory(history);
  }, []);

  const establish = useCallback(
    async (seed: Session) => {
      if (userIdRef.current && userIdRef.current !== seed.id) {
        const empty = emptyUserState();
        setTasks(empty.tasks);
        setGoals(empty.goals);
        setAiHistory(empty.aiHistory);
        setStreak(empty.streak);
      }

      userIdRef.current = seed.id;
      const profile = await hydrateProfile(seed);
      await configurePurchases(profile.id);

      try {
        const sub = await customerInfo();
        setSession({
          ...profile,
          plan: sub.plan,
          subscriptionStatus: sub.status,
          trialEndsAt: sub.expiresAt,
          productId: sub.productId,
          willRenew: sub.willRenew,
        });
      } catch {
        setSession(profile);
      }

      try {
        await loadWorkspace(profile.id);
      } catch {
        setTasks([]);
        setGoals([]);
      }
    },
    [loadWorkspace],
  );

  useEffect(() => {
    let live = true;
    const handledCodes = new Set<string>();

    const consumeAuthUrl = async (url: string | null) => {
      if (!url || !isAuthCallbackUrl(url)) {
        return;
      }

      const key = extractAuthCodeFromUrl(url) ?? url;
      if (handledCodes.has(key)) {
        return;
      }
      handledCodes.add(key);

      try {
        const signedIn = await auth.completeMagicLink(url);
        if (signedIn && live) {
          await establish(signedIn);
        }
      } catch {
        handledCodes.delete(key);
      }
    };

    auth
      .restore()
      .then(async (current) => {
        if (current && live) {
          await establish(current);
        }
      })
      .then(async () => {
        await consumeAuthUrl(await Linking.getInitialURL());
      })
      .finally(() => live && setReady(true));

    const linking = Linking.addEventListener('url', ({ url }) => {
      void consumeAuthUrl(url);
    });

    const subscription = auth.onAuthChange(async (next) => {
      if (!live) {
        return;
      }

      if (!next) {
        clearUserData();
        return;
      }

      if (userIdRef.current !== next.id) {
        await establish(next);
      }
    });

    return () => {
      live = false;
      linking.remove();
      subscription.data.subscription.unsubscribe();
    };
  }, [establish, clearUserData]);

  const value = useMemo<Store>(
    () => ({
      session,
      ready,
      tasks,
      goals,
      settings,
      streak,
      aiHistory,

      async requestSignIn(email, name = 'Student') {
        await auth.sendMagicLink(email, name);
      },

      async signInWithPassword(email, password) {
        const next = await auth.signInWithPassword(email, password);
        if (next) {
          await establish(next);
        }
      },

      async signUpWithPassword(email, password, name) {
        const next = await auth.signUpWithPassword(email, password, name);
        if (next) {
          await establish(next);
        }
      },

      async signInWithGoogle() {
        const next = await auth.signInWithGoogle();
        if (next) {
          await establish(next);
        }
      },

      async sendPhoneCode(phone) {
        await auth.sendPhoneCode(phone);
      },

      async verifyPhoneCode(phone, token) {
        const next = await auth.verifyPhoneCode(phone, token);
        if (next) {
          await establish(next);
        }
      },

      async resetPassword(email) {
        await auth.resetPassword(email);
      },

      async signOut() {
        await auth.signOut();
        clearUserData();
      },

      async deleteAccount() {
        await auth.deleteAccount();
        await auth.signOut();
        clearUserData();
      },

      async setLanguage(language) {
        if (!session) {
          return;
        }

        I18nManager.allowRTL(language === 'ar');
        await studyData.saveLanguage(session.id, language);
        setSettings((current) => ({ ...current, language }));
        setSession({ ...session, language });
      },

      async saveSettings(patch) {
        if (!session) {
          throw Error('Sign in to save settings.');
        }

        await studyData.saveSettings(session.id, patch);
        setSettings((current) => ({ ...current, ...patch }));

        if (patch.language) {
          I18nManager.allowRTL(patch.language === 'ar');
          setSession({ ...session, language: patch.language });
        }
      },

      async toggleTask(id) {
        const old = tasks.find((task) => task.id === id);
        if (!old) {
          return;
        }

        const optimistic = { ...old, done: !old.done };
        setTasks((list) => list.map((task) => (task.id === id ? optimistic : task)));

        try {
          const saved = await studyData.toggleTask(optimistic);
          setTasks((list) => list.map((task) => (task.id === id ? saved : task)));
        } catch {
          setTasks((list) => list.map((task) => (task.id === id ? old : task)));
          throw Error('Unable to save task.');
        }
      },

      async addTask(title, scheduledAt, category = 'study') {
        if (!session) {
          throw Error('Sign in to save tasks.');
        }

        const saved = await studyData.addTask(session.id, title, scheduledAt, category);
        setTasks((list) => [...list, saved]);
      },

      async updateTask(id, patch) {
        if (!session) {
          throw Error('Sign in to save tasks.');
        }

        const saved = await studyData.updateTask(id, patch);
        setTasks((list) => list.map((task) => (task.id === id ? saved : task)));
      },

      async deleteTask(id) {
        if (!session) {
          throw Error('Sign in to delete tasks.');
        }

        await studyData.deleteTask(id);
        setTasks((list) => list.filter((task) => task.id !== id));
      },

      async addGoal(title, targetValue, unit = 'hours', dueAt = null) {
        if (!session) {
          throw Error('Sign in to save goals.');
        }

        const saved = await studyData.addGoal(session.id, title, targetValue, unit, dueAt);
        setGoals((list) => [...list, saved]);
      },

      async updateGoalProgress(id, currentValue) {
        if (!session) {
          throw Error('Sign in to update goals.');
        }

        const saved = await studyData.updateGoalProgress(id, currentValue);
        setGoals((list) => list.map((goal) => (goal.id === id ? saved : goal)));
      },

      async deleteGoal(id) {
        if (!session) {
          throw Error('Sign in to delete goals.');
        }

        await studyData.deleteGoal(id);
        setGoals((list) => list.filter((goal) => goal.id !== id));
      },

      async refreshSubscription() {
        if (!session) {
          return;
        }

        const sub = await customerInfo();
        setSession({
          ...session,
          plan: sub.plan,
          subscriptionStatus: sub.status,
          trialEndsAt: sub.expiresAt,
          productId: sub.productId,
          willRenew: sub.willRenew,
        });
      },

      async recordFocus(startedAt, seconds) {
        if (!session) {
          return;
        }

        await studyData.recordFocus(session.id, startedAt, seconds);
        const today = startOfDay(new Date());
        const days = await studyData.activityDays(
          session.id,
          addDays(today, -400),
          addDays(today, 1),
        );
        setStreak(calculateStreak(days));
      },

      async refreshAiHistory() {
        if (!session) {
          return;
        }

        setAiHistory(await studyData.aiHistory(session.id));
      },

      async deleteAiGeneration(id) {
        await studyData.deleteAiGeneration(id);
        setAiHistory((list) => list.filter((item) => item.id !== id));
      },

      async refreshStreak() {
        if (!session) {
          return;
        }

        const today = startOfDay(new Date());
        const days = await studyData.activityDays(
          session.id,
          addDays(today, -400),
          addDays(today, 1),
        );
        setStreak(calculateStreak(days));
      },
    }),
    [session, ready, tasks, goals, settings, streak, aiHistory, establish, clearUserData],
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useApp = () => {
  const value = useContext(C);

  if (!value) {
    throw Error('AppProvider missing');
  }

  return value;
};
