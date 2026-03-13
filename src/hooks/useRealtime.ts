/**
 * Supabase Realtime subscriptions for real-time chat in mobile-android.
 * - useRealtimeChatMessages: 1:1 conversation messages (messages table)
 * - useRealtimeTeamChatMessages: team chat room messages (team_chat_messages table)
 */

import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import { queryKeys } from "../lib/queryClient";
import type { Message } from "../types/messages";
import { teamChatLog, messagesLog } from "../lib/logger";

type RealtimeChannel = ReturnType<typeof supabase.channel>;

const CHAT_QUERY_KEY = "chat";

function useAppIsActive(): boolean {
  const [isActive, setIsActive] = useState(() => AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      setIsActive(state === "active");
    });
    return () => sub.remove();
  }, []);
  return isActive;
}

/** Map DB row (Realtime payload.new) to app Message type. */
function mapPayloadToMessage(
  row: Record<string, unknown>,
  conversationId: string,
  currentUserId: string
): Message {
  const senderId = String(row.sender_id ?? row.senderId ?? "");
  const text = String(row.text ?? row.body ?? "");
  const sentAt = String(
    row.sent_at ?? row.sentAt ?? row.created_at ?? new Date().toISOString()
  );
  return {
    id: String(row.id ?? ""),
    conversationId,
    senderId,
    text,
    sentAt,
    isFromMe: currentUserId !== "" && senderId === currentUserId,
    status: (row.status as Message["status"]) ?? "sent",
  };
}

/**
 * Subscribe to real-time message updates for a 1:1 conversation.
 * Call this from ChatScreen with the current conversationId.
 */
export function useRealtimeChatMessages(conversationId: string | null): void {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isActive = useAppIsActive();
  const currentUserId = user?.id ?? "";

  useEffect(() => {
    if (!conversationId || !isActive) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          const newMsg = mapPayloadToMessage(newRow, conversationId, currentUserId);
          queryClient.setQueryData<Message[]>([CHAT_QUERY_KEY, conversationId], (prev) => {
            if (!prev) return [newMsg];
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          messagesLog("realtime INSERT", { conversationId, messageId: newMsg.id });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          const updated = mapPayloadToMessage(newRow, conversationId, currentUserId);
          queryClient.setQueryData<Message[]>([CHAT_QUERY_KEY, conversationId], (prev) => {
            if (!prev) return prev;
            return prev.map((m) => (m.id === updated.id ? updated : m));
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const oldId = (payload.old as Record<string, unknown>)?.id as string | undefined;
          if (!oldId) return;
          queryClient.setQueryData<Message[]>([CHAT_QUERY_KEY, conversationId], (prev) => {
            if (!prev) return prev;
            return prev.filter((m) => m.id !== oldId);
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, currentUserId, isActive, queryClient]);
}

/**
 * Subscribe to real-time message updates for a team chat room.
 * Call this from TeamChatThreadScreen with the current room/thread id.
 * On new message we invalidate the messages query so the list refetches with full sender data.
 */
export function useRealtimeTeamChatMessages(roomId: string | undefined): void {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isActive = useAppIsActive();

  useEffect(() => {
    if (!roomId || !isActive) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`team-chat-messages:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.teamChatMessages.list(roomId) });
          teamChatLog("realtime INSERT team_chat_messages", { roomId });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "team_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.teamChatMessages.list(roomId) });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "team_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.teamChatMessages.list(roomId) });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId, isActive, queryClient]);
}
