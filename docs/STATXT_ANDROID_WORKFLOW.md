# Statxt Android app workflow

This document describes the current user-visible workflow of the Android app based on the code in `src/`, implemented to match the iOS workflow.

---

## 1) App boot

**Entry:** `src/App.tsx`

1. App loads fonts (`useFonts` — Inter; splash screen is hidden after layout when fonts are ready).
2. App mounts:
   - `ThemeProvider`
   - `QueryClientProvider` (TanStack Query)
   - `SafeAreaProvider`
   - `AuthProvider` (Supabase Auth + user profile fetch)
   - `CallsProvider` (Vonage/WebRTC placeholder; wire SDK when available)
   - `RealtimeProvider` (foreground refresh of conversation queries)
   - `NotificationProvider` (push registration + tap handling)
3. App mounts `RootNavigator` and registers a navigation ref for push-notification routing and deep linking (`linking` config).

---

## 2) Auth gating

**Gate:** `src/navigation/RootNavigator.tsx`

- While auth state is loading: full-screen activity indicator (dark background, green spinner).
- If `isAuthenticated === true` and `requires2fa === false`: shows `MainTabs`.
- Otherwise: shows `AuthStack`.

### Auth stack

**Stack:** `src/navigation/AuthStack.tsx`

- `Login`
- `Signup`
- `ForgotPassword`
- `TwoFactorVerify` (gesture disabled)

### Login → optional 2FA

**Files:**  
`src/screens/auth/LoginScreen.tsx`, `src/providers/AuthProvider.tsx`, `src/screens/auth/TwoFactorVerifyScreen.tsx`

1. User signs in with Supabase password auth.
2. App calls `GET /api/auth/2fa/toggle` (with bearer token) to detect whether 2FA is enabled.
3. If enabled:
   - `AuthProvider` sets `requires2fa: true` (blocks entry to `MainTabs`).
   - Login screen navigates to `TwoFactorVerify`.
4. `TwoFactorVerify`:
   - Auto-sends OTP via `POST /api/auth/2fa/send`.
   - Verifies OTP via `POST /api/auth/2fa/verify`.
   - Calls `complete2faVerification()` to mark the session authenticated in-app.

If the user already has a session but `requires2fa` is true (e.g. app reopened), the Auth stack opens with initial route `TwoFactorVerify`.

---

## 3) Main navigation (bottom tabs)

**Tabs:** `src/navigation/MainTabs.tsx`

Bottom tab routes:

- `TeamTab` → `TeamStack`
- `ContactsTab` → `ContactsStack`
- `MessagesTab` → `MessagesStack`
- `CampaignsTab` → `CampaignsStack`
- `SettingsTab` → `SettingsStack`
- `MoreTab` → `MoreStack` (includes Dialer)

### Messages workflow

**Stack:** `src/navigation/MessagesStack.tsx`  
- `Conversations` (list)  
- `Chat` (conversation thread, param: `conversationId`)

Flow: Open Messages tab → select a conversation → navigates to Chat.

### Team workflow

**Stack:** `src/navigation/TeamStack.tsx`  
- `TeamMain`  
- `InternalChat`  
- `TeamChatThread` (param: `threadId`)

### Contacts workflow

**Stack:** `src/navigation/ContactsStack.tsx`  
- `ContactsList`  
- `ContactDetail` (param: `contactId`)

### Campaigns workflow

**Stack:** `src/navigation/CampaignsStack.tsx`  
- `CampaignsList`  
- `CampaignDetail` (param: `campaignId`)  
- `CampaignCreate`  
- `AutoBlasts`

### Settings workflow

**Stack:** `src/navigation/SettingsStack.tsx`  
- `SettingsMain`  
- `HelpCenter`

Settings includes (`src/screens/main/SettingsScreen.tsx`):

- Account/profile summary (email)
- Billing & credits (opens billing portal URL)
- Notification permissions (toggle)
- Two-factor auth status + “Manage” (opens web security settings)
- Linked identities (opens web)
- Dark mode (theme toggle)
- Help Center (navigates to `HelpCenter` screen)
- Sign out

---

## 4) Calling workflow

**Provider:** `src/providers/CallsProvider.tsx`  
Placeholder for Vonage WebRTC / CallKit-CallKeep; `startCall` / `endCall` are stubs.

### Call modal screen

Root-level screen: `Call`  
- Defined in `RootNavigator` as a modal (`presentation: "fullScreenModal"`).  
- UI: `src/screens/calls/CallScreen.tsx`

### Dialer

**Screen:** `src/screens/dialer/DialerScreen.tsx`  
- The dialer starts a call by navigating to the root modal `Call` and then calling `startCall()`.
- Access: **More** tab → **Dialer** (via `MoreMenuScreen`).

---

## 5) Push notifications

**Hook:** `src/hooks/usePushNotifications.ts`  
**Provider:** `src/providers/NotificationProvider.tsx`

- On authentication, the app requests notification permission and registers a push token.
- When the app becomes active, it clears the badge.
- Notification taps route via the navigation ref (callbacks set when navigation is ready):
  - `type = new_message` → navigates to **MessagesTab** → **Chat** (with `conversationId` if provided), or to Messages tab only.
  - `type = incoming_call` | `missed_call` → navigates to **MoreTab** → **Dialer**.

---

## 6) Deep linking

**Config:** `src/navigation/linking.ts`

**Prefixes:**  
- `statxt://`  
- `https://app.statxt.com`

**Configured routes:**

- Auth: `login`, `signup`, `forgot-password`
- Main tabs and nested screens:
  - `team`, `team/chat`, `team/thread/:threadId`
  - `contacts`, `contacts/:contactId`
  - `messages`, `messages/:conversationId`
  - `campaigns`, `campaigns/:campaignId`, `campaigns/create`, `campaigns/autoblasts`
  - `settings`, `settings/help`
  - `more`, `more/dialer`
- Root modal: `call`

---

## 7) Foreground/background refresh

**Provider:** `src/providers/RealtimeProvider.tsx`

- When authenticated and the app returns to foreground, it invalidates `conversations` queries so conversation list data is refreshed.

---

## Quick “happy path” summary

1. Launch app → providers mount → `RootNavigator` checks auth.
2. If signed out: **Login** → (optional) **TwoFactorVerify** → enter **MainTabs**.
3. Use tabs:
   - **Team** → internal chat/thread
   - **Contacts** → list → **ContactDetail**
   - **Messages** → Conversations → **Chat**
   - **Campaigns** → list/detail/create/autoblasts
   - **Settings** → billing, notifications, 2FA, linked identities, theme, Help, sign out
   - **More** → **Dialer** → start call → **Call** modal
4. Calls run through `CallsProvider`, displayed in the **Call** modal.
5. Push taps route to Messages/Chat or Dialer; deep links open the correct tab/screen.

---

*This doc reflects the implementation in `src/`. Keep it updated when adding or changing flows.*
