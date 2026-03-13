# Statxt Android

Statxt mobile app (Android) built with React Native and Expo, from scratch in this folder. Uses the same logo and layout concepts as the `mobile` project, with a minimal dependency set to avoid module version errors.

## Prerequisites

- Node.js 18+
- npm or pnpm
- Android Studio / Android SDK (for device or emulator)
- Expo CLI (installed with dependencies)

## Setup

1. **Install dependencies**

   ```bash
   cd mobile-android
   npm install
   ```

2. **Configure environment (optional)**

   Create `.env` or set:

   - `EXPO_PUBLIC_SUPABASE_URL` – your Supabase project URL  
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` – your Supabase anon key  

   If not set, auth will not work until you add these.

3. **Generate Android native project**

   ```bash
   npx expo prebuild --platform android
   ```

   This creates the `android/` folder. Run again with `--clean` if you change plugins or app config.

4. **Run on device/emulator**

   ```bash
   npx expo run android
   ```

   Or start Metro and open Android from Expo dev tools:

   ```bash
   npx expo start --dev-client
   ```

## Scripts

- `npm start` – Start Expo dev server with dev client  
- `npm run android` – Build and run Android app  
- `npm run prebuild` – Generate `android/` (Expo prebuild)  
- `npm run prebuild:clean` – Clean and regenerate `android/`  
- `npm run typecheck` – Run TypeScript check  

## Layout

- **Auth:** Login → Sign up, Forgot password (Supabase auth).  
- **Main (tabs):** Dashboard, Contacts, Messages, Settings.  
- **Theme:** Dark/light with design tokens (spacing, radius, colors).  
- **Assets:** Uses `assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png` (copied from `mobile`).  

## Differences from `mobile`

- No CallKeep, WebRTC, or VoIP (avoids native module version issues).  
- No `@statxt/shared`; minimal local types.  
- Fewer Expo modules; add more as needed.  

## Building a release APK

1. Run `npx expo prebuild --platform android`.  
2. Open `android/` in Android Studio, or use CLI:  
   `cd android && ./gradlew assembleRelease`.  
3. Sign the APK (configure signing in `android/app/build.gradle`).  

Release builds require a keystore; see [Expo docs](https://docs.expo.dev/build-reference/android-builds/) and [React Native signing](https://reactnative.dev/docs/signed-apk-android).
