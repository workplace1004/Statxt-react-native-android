/** Sender or user relation (API / Supabase users join). */
export type TeamChatUser = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

/** Presence status from last_activity_at (same as web). */
export type TeamChatMemberStatus = "online" | "away" | "offline";

/** Room member (API / team_chat_room_members with user). API includes status and last_activity_at for presence. */
export type TeamChatRoomMember = {
  user_id: string;
  user?: TeamChatUser | null;
  /** From GET /api/team-chat/rooms/:id/members: online (≤5min), away (≤30min), offline */
  status?: TeamChatMemberStatus;
  /** When this user was last active (for "X ago" badge next to name) */
  last_activity_at?: string | null;
  [key: string]: unknown;
};

/** Last message summary on a room (API / computed). */
export type TeamChatRoomLastMessage = {
  id?: string | null;
  content?: string | null;
  sender_id?: string | null;
  created_at?: string | null;
};

/** Room (API GET /api/team-chat/rooms or Supabase team_chat_rooms). */
export type TeamChatRoom = {
  id: string;
  organization_id?: string | null;
  name?: string | null;
  type?: "direct" | "group" | "channel";
  avatar_url?: string | null;
  settings?: Record<string, unknown> | null;
  is_archived?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** From API only (not on table). */
  unread_count?: number | null;
  /** From API only (not on table). */
  last_message?: TeamChatRoomLastMessage | null;
  /** From join: team_chat_room_members. */
  members?: TeamChatRoomMember[] | null;
};

/** List rooms response: GET /api/team-chat/rooms */
export type TeamChatRoomsListResponse = {
  rooms?: TeamChatRoom[];
  pagination?: { page: number; limit: number; total: number; hasMore: boolean };
};

/** Single room response: GET /api/team-chat/rooms/:id */
export type TeamChatRoomSingleResponse = {
  room?: TeamChatRoom;
};

/** Reaction on a message (API / team_chat_message_reactions). */
export type TeamChatMessageReaction = {
  id?: string;
  message_id?: string;
  user_id?: string;
  emoji?: string;
  user?: TeamChatUser | null;
  [key: string]: unknown;
};

/** Attachment (API / team_chat_attachments). */
export type TeamChatAttachment = {
  id?: string;
  message_id?: string;
  url?: string;
  type?: string;
  [key: string]: unknown;
};

/** Reply reference (message id or embedded reply message). */
export type TeamChatReplyTo = {
  id?: string;
  content?: string | null;
  sender_id?: string | null;
  [key: string]: unknown;
};

/**
 * Team chat message (API and Supabase team_chat_messages).
 * Base fields plus optional sender, reactions, attachments, reply_to from API/joins.
 */
export type TeamChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  /** From API or Supabase select: sender:users(...) */
  sender?: TeamChatUser | null;
  /** From API or Supabase: reactions:team_chat_message_reactions(...) */
  reactions?: TeamChatMessageReaction[] | null;
  /** From API or Supabase: attachments:team_chat_attachments(*) */
  attachments?: TeamChatAttachment[] | null;
  /** From API: resolved reply message or id */
  reply_to?: TeamChatReplyTo | null;
};
