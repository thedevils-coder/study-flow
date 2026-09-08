import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let client: SupabaseClient | null = null;

/** Lazily creates the client so an unconfigured development checkout remains usable. */
export function getSupabase(): SupabaseClient {
  if (!url || !key) throw new Error('Supabase is not configured. Add the public project URL and publishable key to .env.');
  if (!client) client = createClient(url, key, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' } });
  return client;
}

export const isSupabaseConfigured = Boolean(url && key);
