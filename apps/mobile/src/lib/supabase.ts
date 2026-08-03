import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@faineant/shared";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "local-anon-key";

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: "faineant-auth-session",
  },
});
