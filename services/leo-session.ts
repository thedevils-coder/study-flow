import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  LEGACY_LEO_STORAGE_KEY,
  leoConversationStorageKey,
  parseLeoConversationCache,
  serializeLeoConversationCache,
  type LeoConversationCache,
} from '@/lib/leo-isolation';

export const leoSessionStore = {
  storageKey: leoConversationStorageKey,

  async load(userId: string): Promise<LeoConversationCache | null> {
    const keyed = await AsyncStorage.getItem(leoConversationStorageKey(userId));
    const parsed = parseLeoConversationCache(keyed, userId);
    await AsyncStorage.removeItem(LEGACY_LEO_STORAGE_KEY);
    return parsed;
  },

  async save(userId: string, cache: Omit<LeoConversationCache, 'userId'>) {
    if (!userId) return;
    await AsyncStorage.setItem(
      leoConversationStorageKey(userId),
      serializeLeoConversationCache({ ...cache, userId }),
    );
    await AsyncStorage.removeItem(LEGACY_LEO_STORAGE_KEY);
  },

  async clearShared() {
    await AsyncStorage.removeItem(LEGACY_LEO_STORAGE_KEY);
  },

  async clearUser(userId: string) {
    await AsyncStorage.removeItem(LEGACY_LEO_STORAGE_KEY);
    if (userId) {
      await AsyncStorage.removeItem(leoConversationStorageKey(userId));
    }
  },
};
