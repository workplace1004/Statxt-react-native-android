/**
 * Team chat messages: HTTP API (preferred) then Supabase fallback.
 *
 * API: GET /api/team-chat/rooms/[id]/messages?limit=50&cursor=&direction=older|newer
 * Response: { messages, pagination: { cursor, hasMore, limit } }
 *
 * Supabase: team_chat_messages with sender, reactions, attachments; deleted_at is null.
 */

import { api, uploadStorageFile } from "./api";
import { supabase } from "./supabase";
import { teamChatLog } from "./logger";
import type { TeamChatMessage } from "../types/teamChat";

/** POST /api/team-chat/typing - Notify others in the room that the current user is typing (or stopped). */
export async function sendTeamChatTyping(roomId: string, isTyping: boolean): Promise<void> {
  try {
    await api.post("/api/team-chat/typing", { room_id: roomId, is_typing: isTyping });
  } catch (e) {
    teamChatLog("sendTeamChatTyping", isTyping ? "typing" : "stop", e instanceof Error ? e.message : e);
  }
}

const TEAM_CHAT_BUCKET = "team-chat";

export type TeamChatMessagesOptions = {
  cursor?: string | null;
  limit?: number;
  direction?: "older" | "newer";
};

export type TeamChatMessagesResult = {
  messages: TeamChatMessage[];
  pagination: { cursor: string | null; hasMore: boolean; limit: number };
};

/** Request enough in one page to show full room history (e.g. 24+ records). */
const DEFAULT_LIMIT = 200;

/** Normalize API or Supabase message row to TeamChatMessage */
function normalizeMessage(row: Record<string, unknown>): TeamChatMessage {
  const msg: TeamChatMessage = {
    id: String(row.id ?? ""),
    room_id: String(row.room_id ?? ""),
    sender_id: String(row.sender_id ?? ""),
    content: String(row.content ?? ""),
    message_type: String(row.message_type ?? "text"),
    reply_to_id: row.reply_to_id != null ? String(row.reply_to_id) : null,
    edited_at: row.edited_at != null ? String(row.edited_at) : null,
    deleted_at: row.deleted_at != null ? String(row.deleted_at) : null,
    metadata:
      row.metadata != null && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
  if (row.sender != null && typeof row.sender === "object") {
    const s = row.sender as Record<string, unknown>;
    msg.sender = {
      id: String(s.id ?? ""),
      full_name: s.full_name != null ? String(s.full_name) : null,
      email: s.email != null ? String(s.email) : null,
      avatar_url: s.avatar_url != null ? String(s.avatar_url) : null,
    };
  }
  if (Array.isArray(row.reactions)) {
    msg.reactions = row.reactions as TeamChatMessage["reactions"];
  }
  if (Array.isArray(row.attachments)) {
    msg.attachments = row.attachments as TeamChatMessage["attachments"];
  }
  if (row.reply_to != null && typeof row.reply_to === "object") {
    msg.reply_to = row.reply_to as TeamChatMessage["reply_to"];
  }
  return msg;
}

const SUPABASE_SELECT =
  "*, sender:users(id, full_name, email, avatar_url), reactions:team_chat_message_reactions(*, user:users(id, full_name, avatar_url)), attachments:team_chat_attachments(*)";

/**
 * List messages in a room. Prefers GET /api/team-chat/rooms/[roomId]/messages;
 * falls back to Supabase team_chat_messages with sender, reactions, attachments, deleted_at is null.
 */
export async function fetchTeamChatMessages(
  roomId: string,
  options: TeamChatMessagesOptions = {}
): Promise<TeamChatMessagesResult> {
  const { cursor, limit = DEFAULT_LIMIT, direction = "older" } = options;
  teamChatLog("fetchTeamChatMessages", { roomId, cursor: cursor ?? null, limit, direction });

  // 1) HTTP API (preferred)
  try {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("direction", direction);
    if (cursor) params.set("cursor", cursor);
    const path = `/api/team-chat/rooms/${encodeURIComponent(roomId)}/messages?${params.toString()}`;
    teamChatLog("fetchTeamChatMessages", "trying API", path);
    const response = await api.get<{ messages: unknown[]; pagination: { cursor?: string | null; hasMore?: boolean; limit?: number } }>(path);
    const rawMessages = Array.isArray(response?.messages) ? response.messages : [];
    const pagination = response?.pagination;
    const messages = rawMessages.map((m) => normalizeMessage(m as Record<string, unknown>));
    teamChatLog("fetchTeamChatMessages done", { source: "API", count: messages.length });
    return {
      messages,
      pagination: {
        cursor: pagination?.cursor ?? null,
        hasMore: Boolean(pagination?.hasMore),
        limit: Number(pagination?.limit ?? limit),
      },
    };
  } catch (e) {
    teamChatLog("fetchTeamChatMessages", "API failed", e instanceof Error ? e.message : e);
  }

  // 2) Supabase: team_chat_messages with relations, deleted_at is null
  try {
    teamChatLog("fetchTeamChatMessages", "trying Supabase team_chat_messages");
    const ascending = direction === "newer";
    let query = supabase
      .from("team_chat_messages")
      .select(SUPABASE_SELECT)
      .eq("room_id", roomId)
      .is("deleted_at", null)
      .order("created_at", { ascending })
      .limit(limit + 1);

    // Optional cursor: fetch after/before message id (simple cursor by id)
    if (cursor) {
      const { data: cursorRow } = await supabase
        .from("team_chat_messages")
        .select("created_at")
        .eq("id", cursor)
        .single();
      const createdAt = cursorRow?.created_at;
      if (createdAt) {
        query = ascending
          ? query.gt("created_at", createdAt)
          : query.lt("created_at", createdAt);
      }
    }

    const { data, error } = await query;

    if (error) {
      teamChatLog("fetchTeamChatMessages", "Supabase error", error.message);
      return { messages: [], pagination: { cursor: null, hasMore: false, limit } };
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const lastId = slice.length > 0 ? String((slice[slice.length - 1] as { id?: string }).id) : null;
    const messages = slice.map((row) => normalizeMessage(row));
    teamChatLog("fetchTeamChatMessages done", { source: "Supabase", count: messages.length });
    return {
      messages,
      pagination: { cursor: hasMore ? lastId : null, hasMore, limit },
    };
  } catch (e) {
    teamChatLog("fetchTeamChatMessages failed", e instanceof Error ? e.message : e);
    return { messages: [], pagination: { cursor: null, hasMore: false, limit } };
  }
}

/**
 * Upload a file (e.g. image) for team chat. Uses POST /api/storage/upload.
 * Returns the public URL of the uploaded file.
 */
export async function uploadTeamChatFile(
  roomId: string,
  uri: string,
  mimeType: string,
  fileName: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  formData.append("bucket", TEAM_CHAT_BUCKET);
  formData.append("folder", `rooms/${roomId}`);

  try {
    const res = await uploadStorageFile(formData);
    const url = typeof res?.url === "string" && res.url.trim() ? res.url.trim() : null;
    if (!url) throw new Error("Upload did not return a URL");
    teamChatLog("uploadTeamChatFile done", { roomId, url: url.slice(0, 50) + "..." });
    return url;
  } catch (e) {
    teamChatLog("uploadTeamChatFile failed", { roomId, fileName, mimeType, error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

export type SendTeamChatMessageOptions = {
  attachmentUrl?: string;
  attachmentType?: string;
};

/**
 * Send a message in a team chat room.
 * API: POST /api/team-chat/rooms/[roomId]/messages { content, attachment_url?, message_type? }
 * Fallback: Supabase insert into team_chat_messages.
 * When attachmentUrl is provided, content may be empty (sends as image/file message).
 */
export async function sendTeamChatMessage(
  roomId: string,
  content: string,
  options?: SendTeamChatMessageOptions
): Promise<TeamChatMessage> {
  const trimmed = (content ?? "").trim();
  const { attachmentUrl, attachmentType = "image" } = options ?? {};
  if (!trimmed && !attachmentUrl) throw new Error("Message content or attachment is required");

  teamChatLog("sendTeamChatMessage", { roomId, contentLength: trimmed.length, hasAttachment: !!attachmentUrl });

  const body: Record<string, unknown> = {
    content: trimmed || (attachmentUrl ? "[Image]" : ""),
    message_type: attachmentUrl ? attachmentType : "text",
  };
  if (attachmentUrl) body.attachment_url = attachmentUrl;

  try {
    const response = await api.post<{ message?: Record<string, unknown>; data?: Record<string, unknown> }>(
      `/api/team-chat/rooms/${encodeURIComponent(roomId)}/messages`,
      body
    );
    const row =
      (response as Record<string, unknown>).message ??
      (response as Record<string, unknown>).data ??
      response;
    if (row && typeof row === "object") {
      const msg = normalizeMessage(row as Record<string, unknown>);
      teamChatLog("sendTeamChatMessage done", { source: "API", messageId: msg.id });
      return msg;
    }
    throw new Error("Invalid response");
  } catch (e) {
    teamChatLog("sendTeamChatMessage", "API failed", e instanceof Error ? e.message : e);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("team_chat_messages")
    .insert({
      room_id: roomId,
      sender_id: user.id,
      content: attachmentUrl ?? trimmed,
      message_type: attachmentUrl ? attachmentType : "text",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to send message");
  }
  const msg = normalizeMessage(data as Record<string, unknown>);
  teamChatLog("sendTeamChatMessage done", { source: "Supabase", messageId: msg.id });
  return msg;
}

/**
 * Delete (soft-delete) a team chat message.
 * API: DELETE /api/team-chat/rooms/[roomId]/messages/[messageId]
 * Fallback: Supabase update team_chat_messages set deleted_at = now() where id = messageId.
 */
export async function deleteTeamChatMessage(roomId: string, messageId: string): Promise<void> {
  teamChatLog("deleteTeamChatMessage", { roomId, messageId });

  try {
    await api.delete(
      `/api/team-chat/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}`
    );
    teamChatLog("deleteTeamChatMessage done", { source: "API" });
    return;
  } catch (e) {
    teamChatLog("deleteTeamChatMessage", "API failed", e instanceof Error ? e.message : e);
  }

  const { error } = await supabase
    .from("team_chat_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("room_id", roomId);

  if (error) {
    teamChatLog("deleteTeamChatMessage", "Supabase error", error.message);
    throw new Error(error.message);
  }
  teamChatLog("deleteTeamChatMessage done", { source: "Supabase" });
}
