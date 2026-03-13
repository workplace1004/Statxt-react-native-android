# Real-Time Chat Implementation Guide (mobile-android)

This document provides **step-by-step instructions** for implementing real-time chat in the `mobile-android` React Native app using **Supabase Realtime**. You can follow these steps manually or use them as context for Cursor AI.

**Implementation status:** The hooks and screen wiring described below are already implemented in this repo (Steps 2–3). You only need to ensure the Supabase migration (Step 1) has been applied to your project.

---

## Overview

- **1:1 chat (Messages tab):** Conversations with contacts; messages live in the `messages` table (`conversation_id`).
- **Team chat:** Room-based chat; messages live in the `team_chat_messages` table (`room_id`).

**Flow:** The app sends messages via existing HTTP APIs. New messages are **received in real time** by subscribing to Supabase Realtime `postgres_changes` on the same tables. No separate socket library is required; Supabase Realtime uses WebSockets internally.

---

## Step 1: Ensure Supabase Realtime is enabled for the tables

Realtime only delivers events for tables that are in the `supabase_realtime` publication.

1. Open your Supabase project → **SQL Editor**.
2. Run the following (idempotent) migration if not already applied. The same migration exists in the repo at `supabase/migrations/20260218171000_enable_realtime_messages_team_chat.sql`—apply it via your normal migration process, or run the SQL below in the SQL Editor:

```sql
-- Add public.messages and public.team_chat_messages to Supabase Realtime publication.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END;
$$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT * FROM (VALUES
      ('public', 'messages'),
      ('public', 'team_chat_messages')
    ) AS t(schemaname, tablename)
  ) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = r.schemaname
        AND tablename = r.tablename
    ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I',
        r.schemaname,
        r.tablename
      );
    END IF;
  END LOOP;
END;
$$;
```

3. Confirm that Row Level Security (RLS) allows the authenticated user to read the rows they subscribe to (existing RLS on `messages` and `team_chat_messages` should already do this).

---

## Step 2: Add the Realtime hooks in the app

The app needs two subscription layers:

1. **1:1 chat:** Subscribe to `messages` filtered by `conversation_id`.
2. **Team chat:** Subscribe to `team_chat_messages` filtered by `room_id`.

### 2a. Create `src/hooks/useRealtime.ts`

This file should:

- Use the existing `supabase` client from `src/lib/supabase.ts`.
- Use `AppState` so subscriptions only run when the app is in the foreground (optional but recommended to save battery and avoid duplicate updates).
- Use React Query’s `queryClient` to update cache on INSERT/UPDATE/DELETE.

**Required exports:**

- **`useRealtimeChatMessages(conversationId: string | null)`**
  - When `conversationId` is set and app is active: create a channel for `messages` with filter `conversation_id=eq.${conversationId}`.
  - On **INSERT:** Map `payload.new` to the app’s `Message` type (e.g. `id`, `conversationId`, `senderId`, `text` or `body`, `sentAt` or `created_at`, `isFromMe` by comparing `sender_id` to current user id). Append to the query cache for `["chat", conversationId]`.
  - On **UPDATE:** Replace the message in cache with the same `id`.
  - On **DELETE:** Remove the message with `payload.old.id` from cache.
  - Cleanup: on unmount or when `conversationId`/active changes, call `supabase.removeChannel(channel)`.

- **`useRealtimeTeamChatMessages(roomId: string | undefined)`**
  - When `roomId` is set and app is active: create a channel for `team_chat_messages` with filter `room_id=eq.${roomId}`.
  - On **INSERT:** Invalidate the React Query key for team chat messages for this room (e.g. `queryKeys.teamChatMessages.list(roomId)`) so the list refetches and shows the new message with sender info.
  - On **UPDATE:** Optionally update the message in the cache for that room (by `id`).
  - On **DELETE:** Optionally remove the message from cache or invalidate.
  - Cleanup: same as above.

**Implementation details:**

- Channel name must be unique per subscription, e.g. `messages:${conversationId}` and `team-chat-messages:${roomId}`.
- Use `queryClient.getQueryData` / `queryClient.setQueryData` for the 1:1 chat list (array of `Message`).
- For team chat, the list comes from an infinite query; invalidating the list key and letting the hook refetch is the simplest way to show new messages with full sender data.
- Map DB columns to app types: e.g. `conversation_id` → `conversationId`, `body` or `text` → `text`, `created_at` or `sent_at` → `sentAt`, and `isFromMe = (payload.new.sender_id === currentUserId)`.

---

## Step 3: Use the hooks in the screens

### 3a. 1:1 Chat screen

- File: `src/screens/messages/ChatScreen.tsx`.
- After `useChatMessages(conversationId)`, call **`useRealtimeChatMessages(conversationId)`**.
- No other change required: when a new row is inserted into `messages` for this conversation, the hook updates the React Query cache and the existing list re-renders.

### 3b. Team chat thread screen

- File: `src/screens/team/TeamChatThreadScreen.tsx`.
- After `useTeamChatMessages(threadId, …)`, call **`useRealtimeTeamChatMessages(threadId)`** (using the same `threadId` as the room id).
- When a new message is inserted into `team_chat_messages` for this room, the hook invalidates (or updates) the messages query so the list refetches and shows the new message.

---

## Step 4: RealtimeProvider (optional enhancement)

- File: `src/providers/RealtimeProvider.tsx`.
- Current behavior: invalidates conversations and chat queries when the app returns to the foreground.
- Optional: Keep this as-is. The new hooks handle live updates while the screen is open; refocus invalidation remains a good fallback when Realtime was disconnected or missed events.

---

## Step 5: Sending messages (unchanged)

- **1:1 chat:** Continue using `sendMessage` from `useChatMessages` (API or Supabase insert). Optimistic updates already add the message to the UI; Realtime may deliver the same row again—deduplicate in the hook by `id` (or by a temporary id for optimistic messages).
- **Team chat:** Continue using POST to `/api/team-chat/rooms/:id/messages` (or your send API). After send, you can either rely on Realtime to deliver the new row and trigger a refetch, or optimistically append and let Realtime overwrite/dedupe.

---

## Step 6: Testing

1. **1:1 chat:** Open a conversation on the device; send a message from another client (e.g. web or another user). The new message should appear in the app without refresh.
2. **Team chat:** Open a room; send a message from web or another device. The new message should appear in the app.
3. **Background:** Send a message while the app is in the background; bring the app to the foreground. Either Realtime reconnects and delivers the event, or the existing RealtimeProvider invalidation should refresh the list.

---

## File checklist

| Step | File | Action |
|------|------|--------|
| 1 | Supabase project | Run SQL to add `messages` and `team_chat_messages` to `supabase_realtime` (or add a migration in repo). |
| 2a | `mobile-android/src/hooks/useRealtime.ts` | Create with `useRealtimeChatMessages` and `useRealtimeTeamChatMessages`. |
| 3a | `mobile-android/src/screens/messages/ChatScreen.tsx` | Call `useRealtimeChatMessages(conversationId)`. |
| 3b | `mobile-android/src/screens/team/TeamChatThreadScreen.tsx` | Call `useRealtimeTeamChatMessages(threadId)`. |
| 4 | `mobile-android/src/providers/RealtimeProvider.tsx` | Optional: leave as-is or extend. |

---

## Cursor AI usage

You can paste this document (or the relevant steps) into Cursor and ask it to:

1. Create `src/hooks/useRealtime.ts` with the two hooks as described.
2. Add `useRealtimeChatMessages(conversationId)` to `ChatScreen.tsx`.
3. Add `useRealtimeTeamChatMessages(threadId)` to `TeamChatThreadScreen.tsx`.
4. Optionally add a Supabase migration file in the repo for Step 1.

Reference implementations in this repo:

- Web: `hooks/use-realtime.ts` (generic `useRealtime`), `hooks/use-messages.ts` (realtime subscription for `messages`).
- Team chat web: `hooks/team-chat/use-team-chat-messages.ts` (realtime for `team_chat_messages`).
- Other mobile app: `mobile/src/hooks/useRealtime.ts` (realtime messages and conversations).
