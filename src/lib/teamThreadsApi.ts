/**
 * Team chat threads (Chats tab).
 * Prefers GET /api/team-chat/rooms (or Supabase team_chat_rooms), then fallbacks.
 * Unread count is computed client-side from last-read timestamp (not total message count).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";
import { supabase } from "./supabase";
import { teamChatLog } from "./logger";
import { fetchTeamChatRooms } from "./teamChatRoomsApi";
import type { TeamChatRoom } from "../types/teamChat";
import type { TeamThread } from "../types/campaigns";

const LAST_READ_PREFIX = "team_chat_last_read_";

export async function getLastReadAt(roomId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_READ_PREFIX + roomId);
  } catch {
    return null;
  }
}

export async function setLastReadAt(roomId: string, iso: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_READ_PREFIX + roomId, iso);
  } catch (e) {
    teamChatLog("setLastReadAt failed", e instanceof Error ? e.message : e);
  }
}

/** Count messages in room with created_at > lastReadAt (unread). */
async function getUnreadCountForRoom(roomId: string, lastReadAt: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("team_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId)
      .gt("created_at", lastReadAt);
    if (error) return 0;
    return typeof count === "number" ? Math.max(0, count) : 0;
  } catch {
    return 0;
  }
}

function roomToTeamThread(room: TeamChatRoom, currentUserId: string, unreadCountOverride?: number): TeamThread {
  const members = Array.isArray(room.members) ? room.members : [];
  const other = members.find((m) => String(m.user_id) !== currentUserId);
  const otherUser = other?.user;
  const title =
    (room.name ?? "").trim() ||
    (otherUser?.full_name ?? "").trim() ||
    (otherUser?.email ?? "").trim() ||
    (room.type === "group" ? "Group" : room.type === "channel" ? "Channel" : "Chat");

  const lastMessage = room.last_message;
  const lastMessageAt =
    lastMessage?.created_at ?? room.updated_at ?? room.created_at ?? new Date().toISOString();

  const unreadCount =
    unreadCountOverride !== undefined ? unreadCountOverride : Number(room.unread_count ?? 0);

  return {
    id: String(room.id),
    title: title || "Chat",
    lastMessagePreview: String(lastMessage?.content ?? "").trim(),
    lastMessageAt,
    unreadCount,
    type: room.type ?? undefined,
  };
}

// --- Legacy / fallback types ---
type Row = {
  id: string;
  title: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count?: number;
  [key: string]: unknown;
};

function mapRow(r: Row): TeamThread {
  const type = r.type as TeamThread["type"] | undefined;
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    lastMessagePreview: String(r.last_message_preview ?? ""),
    lastMessageAt: String(r.last_message_at ?? new Date().toISOString()),
    unreadCount: Number(r.unread_count ?? 0),
    type: type === "direct" || type === "group" || type === "channel" ? type : undefined,
  };
}

/**
 * Fetch team chat threads (Chats list). Prefers GET /api/team-chat/rooms then Supabase team_chat_rooms.
 */
export async function fetchTeamThreads(): Promise<TeamThread[]> {
  teamChatLog("fetchTeamThreads", "start");
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? "";
  teamChatLog("fetchTeamThreads", { userId: currentUserId ? currentUserId.slice(0, 8) + "..." : null });

  // 1) GET /api/team-chat/rooms — fetch all types (direct, group, channel) so web-created groups appear
  try {
    const { rooms } = await fetchTeamChatRooms({
      archived: false,
      limit: 50,
      page: 1,
    });
    const list: TeamThread[] = [];
    for (const room of rooms) {
      const roomId = String(room.id);
      const lastReadAt = await getLastReadAt(roomId);
      const unreadCount =
        lastReadAt != null
          ? await getUnreadCountForRoom(roomId, lastReadAt)
          : await getUnreadCountForRoom(roomId, "1970-01-01T00:00:00.000Z");
      list.push(roomToTeamThread(room, currentUserId, unreadCount));
    }
    teamChatLog("fetchTeamThreads done", { source: "api/team-chat/rooms or Supabase rooms", count: list.length });
    return list;
  } catch (e) {
    teamChatLog("fetchTeamThreads", "rooms failed", e instanceof Error ? e.message : e);
    // 2) Fallback: GET /team/threads
    try {
      teamChatLog("fetchTeamThreads", "trying team/threads");
      const response = await api.get<Row[] | { data: Row[] }>("/team/threads");
      const rows = Array.isArray(response) ? response : (response as { data: Row[] })?.data ?? [];
      const list = rows.map(mapRow);
      teamChatLog("fetchTeamThreads done", { source: "team/threads", count: list.length });
      return list;
    } catch (e2) {
      teamChatLog("fetchTeamThreads", "team/threads failed", e2 instanceof Error ? e2.message : e2);
      // 3) Fallback: Supabase team_threads
      try {
        if (!currentUserId) {
          teamChatLog("fetchTeamThreads", "not authenticated, skip Supabase");
          return [];
        }
        teamChatLog("fetchTeamThreads", "trying Supabase team_threads");
        const { data, error } = await supabase
          .from("team_threads")
          .select("*")
          .order("last_message_at", { ascending: false });
        if (error || !data) {
          teamChatLog("fetchTeamThreads", "Supabase team_threads", error?.message ?? "no data");
          throw error ?? new Error("no data");
        }
        const list = (data as Row[]).map(mapRow);
        teamChatLog("fetchTeamThreads done", { source: "supabase team_threads", count: list.length });
        return list;
      } catch (e3) {
        // 4) Fallback: derive threads from team_chat_messages (one thread per room_id, latest message)
        try {
          teamChatLog("fetchTeamThreads", "trying Supabase team_chat_messages");
          const { data: messages, error: msgError } = await supabase
            .from("team_chat_messages")
            .select("room_id,content,created_at")
            .order("created_at", { ascending: false })
            .limit(1000);
          if (msgError) {
            teamChatLog("fetchTeamThreads", "Supabase team_chat_messages", msgError.message);
            return [];
          }
          const messageList = (messages ?? []) as { room_id: string; content: string; created_at: string }[];
          const seen = new Set<string>();
          const list: TeamThread[] = [];
          for (const m of messageList) {
            const rid = String(m?.room_id ?? "");
            if (!rid || seen.has(rid)) continue;
            seen.add(rid);
            list.push({
              id: rid,
              title: "Chat",
              lastMessagePreview: String(m?.content ?? "").trim().slice(0, 100),
              lastMessageAt: String(m?.created_at ?? new Date().toISOString()),
              unreadCount: 0,
            });
          }
          teamChatLog("fetchTeamThreads done", {
            source: "supabase team_chat_messages",
            messageCount: messageList.length,
            threadCount: list.length,
          });
          return list;
        } catch (e4) {
          teamChatLog("fetchTeamThreads failed", e4 instanceof Error ? e4.message : e4);
          return [];
        }
      }
    }
  }
}
