import type { ConfigContext, ExpoConfig } from "expo/config";

const APP_VERSION = "1.0.0";
const BUILD_NUMBER = process.env.BUILD_NUMBER ?? "1";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Statxt",
  slug: "statxt-android",
  version: APP_VERSION,
  platforms: ["android", "web"],
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  jsEngine: "hermes",
  scheme: "statxt",

  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#000000",
  },

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#000000",
    },
    package: "com.statxt.app",
    versionCode: parseInt(BUILD_NUMBER, 10),
    permissions: [
      "INTERNET",
      "READ_CONTACTS",
      "POST_NOTIFICATIONS",
      "RECORD_AUDIO",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "VIBRATE",
    ],
  },

  plugins: ["expo-secure-store"],

  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://app.statxt.com",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    appVariant: process.env.APP_VARIANT ?? "production",
  },
});
