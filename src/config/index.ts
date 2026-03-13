import Constants from "expo-constants";

interface Config {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  appVariant: "development" | "preview" | "production";
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const config: Config = {
  apiUrl: extra.apiUrl ?? "https://app.statxt.com",
  supabaseUrl: extra.supabaseUrl ?? "",
  supabaseAnonKey: extra.supabaseAnonKey ?? "",
  appVariant: (extra.appVariant as Config["appVariant"]) ?? "production",
};

export function validateConfig(): void {
  const missing: string[] = [];
  if (!config.supabaseUrl) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!config.supabaseAnonKey) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length > 0) {
    console.warn(`[Config] Missing: ${missing.join(", ")}`);
  }
}
