import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { config } from "../config";

/**
 * Supabase auth session can exceed SecureStore's 2048-byte limit, causing login
 * to fail when persisting the session. AsyncStorage has no such limit and is
 * the recommended approach for React Native when session size is large.
 */
const asyncStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error("[AuthStorage] setItem failed:", key, e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error("[AuthStorage] removeItem failed:", key, e);
    }
  },
};

export const supabase = createClient(
  config.supabaseUrl || "https://placeholder.supabase.co",
  config.supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      storage: asyncStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
