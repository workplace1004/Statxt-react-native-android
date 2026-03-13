/**
 * Team chat rooms: HTTP API (preferred) then Supabase fallback.
 *
 * List: GET /api/team-chat/rooms?type=&archived=&search=&limit=&page=
 * Single: GET /api/team-chat/rooms/:id
 *
 * Supabase: team_chat_rooms + team_chat_room_members (room IDs for current user first).
 */

import { api } from "./api";
import { supabase } from "./supabase";
import { teamChatLog } from "./logger";
import type {
  TeamChatRoom,
  TeamChatRoomMember,
  TeamChatRoomSingleResponse,
  TeamChatRoomsListResponse,
  TeamChatUser,
} from "../types/teamChat";

export type TeamChatRoomsListOptions = {
  type?: "direct" | "group" | "channel";
  archived?: boolean;
  search?: string;
  limit?: number;
  page?: number;
};

const DEFAULT_LIMIT = 50;
const DEFAULT_PAGE = 1;

const ROOMS_SELECT =
  "*, members:team_chat_room_members(*, user:users(id, full_name, email, avatar_url))";

function normalizeRoom(row: Record<string, unknown>): TeamChatRoom {
  return {
    id: String(row.id ?? ""),
    organization_id: row.organization_id != null ? String(row.organization_id) : null,
    name: row.name != null ? String(row.name) : null,
    type: row.type != null ? (row.type as TeamChatRoom["type"]) : undefined,
    avatar_url: row.avatar_url != null ? String(row.avatar_url) : null,
    settings:
      row.settings != null && typeof row.settings === "object" && !Array.isArray(row.settings)
        ? (row.settings as Record<string, unknown>)
        : null,
    is_archived: row.is_archived != null ? Boolean(row.is_archived) : null,
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: row.created_at != null ? String(row.created_at) : null,
    updated_at: row.updated_at != null ? String(row.updated_at) : null,
    unread_count: row.unread_count != null ? Number(row.unread_count) : null,
    last_message:
      row.last_message != null && typeof row.last_message === "object"
        ? (row.last_message as TeamChatRoom["last_message"])
        : null,
    members: Array.isArray(row.members) ? (row.members as TeamChatRoom["members"]) : null,
  };
}

/**
 * List rooms for the current user. Prefers GET /api/team-chat/rooms; falls back to Supabase.
 */
export async function fetchTeamChatRooms(
  options: TeamChatRoomsListOptions = {}
): Promise<{ rooms: TeamChatRoom[]; pagination: { page: number; limit: number; total: number; hasMore: boolean } }> {
  const {
    type,
    archived = false,
    search,
    limit = DEFAULT_LIMIT,
    page = DEFAULT_PAGE,
  } = options;
  teamChatLog("fetchTeamChatRooms", { type, archived, search, limit, page });

  // 1) HTTP API (preferred)
  let apiRooms: TeamChatRoom[] = [];
  try {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    params.set("archived", String(archived));
    if (search) params.set("search", search);
    params.set("limit", String(limit));
    params.set("page", String(page));
    const path = `/api/team-chat/rooms?${params.toString()}`;
    teamChatLog("fetchTeamChatRooms", "trying API", path);
    const response = await api.get<TeamChatRoomsListResponse>(path);
    apiRooms = (response?.rooms ?? []).map((r) => normalizeRoom(r as Record<string, unknown>));
    if (apiRooms.length > 0) {
      const pagination = response?.pagination ?? {
        page,
        limit,
        total: apiRooms.length,
        hasMore: false,
      };
      teamChatLog("fetchTeamChatRooms done", { source: "API", count: apiRooms.length });
      return { rooms: apiRooms, pagination };
    }
    teamChatLog("fetchTeamChatRooms", "API returned 0 rooms, trying Supabase");
  } catch (e) {
    teamChatLog("fetchTeamChatRooms", "API failed", e instanceof Error ? e.message : e);
  }

  // 2) Supabase: room IDs from team_chat_room_members, then team_chat_rooms (or by organization_id)
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    if (!currentUserId) {
      teamChatLog("fetchTeamChatRooms", "not authenticated");
      return { rooms: [], pagination: { page, limit, total: 0, hasMore: false } };
    }

    teamChatLog("fetchTeamChatRooms", "trying Supabase");
    const { data: memberRows, error: memberError } = await supabase
      .from("team_chat_room_members")
      .select("room_id")
      .eq("user_id", currentUserId);

    let roomIds: string[] = [];
    if (!memberError && memberRows?.length) {
      roomIds = memberRows.map((r: { room_id: string }) => r.room_id);
    } else {
      teamChatLog("fetchTeamChatRooms", "Supabase members", memberError?.message ?? "no membership rows");
    }

    const offset = (page - 1) * limit;
    let query;

    if (roomIds.length > 0) {
      query = supabase
        .from("team_chat_rooms")
        .select(ROOMS_SELECT, { count: "exact" })
        .in("id", roomIds)
        .eq("is_archived", archived)
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);
    } else {
      const orgId =
        (user?.user_metadata as { organization_id?: string } | undefined)?.organization_id ??
        (user?.app_metadata as { organization_id?: string } | undefined)?.organization_id;
      if (!orgId) {
        teamChatLog("fetchTeamChatRooms", "no room members and no organization_id");
        return { rooms: [], pagination: { page, limit, total: 0, hasMore: false } };
      }
      teamChatLog("fetchTeamChatRooms", "fallback: rooms by organization_id", orgId.slice(0, 8) + "...");
      query = supabase
        .from("team_chat_rooms")
        .select(ROOMS_SELECT, { count: "exact" })
        .eq("organization_id", orgId)
        .eq("is_archived", archived)
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);
    }

    if (type) query = query.eq("type", type);
    if (search?.trim()) query = query.ilike("name", `%${search.trim()}%`);

    const { data: roomRows, error: roomError, count } = await query;

    if (roomError) {
      teamChatLog("fetchTeamChatRooms", "Supabase rooms", roomError.message);
      return { rooms: [], pagination: { page, limit, total: 0, hasMore: false } };
    }

    const rooms = (roomRows ?? []).map((r) => normalizeRoom(r as Record<string, unknown>));
    const total = typeof count === "number" ? count : rooms.length;
    const hasMore = offset + rooms.length < total;
    teamChatLog("fetchTeamChatRooms done", { source: "Supabase", count: rooms.length });
    return {
      rooms,
      pagination: { page, limit, total, hasMore },
    };
  } catch (e) {
    teamChatLog("fetchTeamChatRooms failed", e instanceof Error ? e.message : e);
    return { rooms: [], pagination: { page, limit, total: 0, hasMore: false } };
  }
}

/** Room members API response: GET /api/team-chat/rooms/:id/members (includes status from last_activity_at) */
type RoomMembersApiResponse = {
  members?: Array<{
    user_id?: string;
    user?: { id?: string; full_name?: string | null; email?: string | null; avatar_url?: string | null; last_activity_at?: string | null };
    /** online (≤5min), away (≤30min), offline - computed by API */
    status?: "online" | "away" | "offline";
    [key: string]: unknown;
  }>;
};

function normalizeRoomMember(row: Record<string, unknown>): TeamChatRoomMember {
  const user = row.user != null && typeof row.user === "object" ? (row.user as Record<string, unknown>) : null;
  const status = row.status === "online" || row.status === "away" || row.status === "offline" ? row.status : undefined;
  const last_activity_at =
    user?.last_activity_at != null && typeof user.last_activity_at === "string"
      ? String(user.last_activity_at)
      : null;
  return {
    user_id: String(row.user_id ?? user?.id ?? ""),
    user: user
      ? {
          id: String(user.id ?? ""),
          full_name: user.full_name != null ? String(user.full_name) : null,
          email: user.email != null ? String(user.email) : null,
          avatar_url: user.avatar_url != null ? String(user.avatar_url) : null,
        }
      : null,
    status,
    last_activity_at: last_activity_at ?? undefined,
  };
}

/**
 * Fetch last_activity_at from Supabase users table for given user IDs.
 * Use when API returns null so we read directly from the users table.
 */
async function fetchLastActivityAtFromSupabase(
  userIds: string[]
): Promise<Record<string, string | null>> {
  if (userIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, last_activity_at")
      .in("id", userIds);
    if (error) {
      teamChatLog("last_activity_at from Supabase error", error.message);
      return {};
    }
    const map: Record<string, string | null> = {};
    for (const row of data ?? []) {
      const id = row?.id != null ? String(row.id) : null;
      const at = row?.last_activity_at != null ? String(row.last_activity_at) : null;
      if (id) map[id] = at;
    }
    teamChatLog("last_activity_at from Supabase", Object.entries(map).map(([id, at]) => ({ user_id: id, last_activity_at: at })));
    return map;
  } catch (e) {
    teamChatLog("last_activity_at from Supabase failed", e instanceof Error ? e.message : e);
    return {};
  }
}

/**
 * Fetch room members with user details. Uses GET /api/team-chat/rooms/:id/members (same as web).
 * Then fetches last_activity_at from Supabase users table and merges so we always have it when RLS allows.
 */
export async function fetchTeamChatRoomMembers(roomId: string): Promise<TeamChatRoomMember[]> {
  teamChatLog("fetchTeamChatRoomMembers", { roomId });
  try {
    const response = await api.get<RoomMembersApiResponse>(
      `/api/team-chat/rooms/${encodeURIComponent(roomId)}/members`
    );
    const raw = response?.members ?? [];
    const members = raw.map((m) => normalizeRoomMember(m as Record<string, unknown>));
    teamChatLog("last_activity_at from API", members.map((m) => ({ user_id: m.user_id, last_activity_at: m.last_activity_at ?? null })));

    const userIds = members.map((m) => m.user_id).filter(Boolean);
    const lastActivityMap = await fetchLastActivityAtFromSupabase(userIds);
    for (const m of members) {
      if (m.user_id in lastActivityMap) {
        m.last_activity_at = lastActivityMap[m.user_id] ?? undefined;
      }
    }

    return members;
  } catch (e) {
    teamChatLog("fetchTeamChatRoomMembers failed", e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * Get a single room by id. Prefers GET /api/team-chat/rooms/:id; falls back to Supabase.
 */
export async function fetchTeamChatRoom(roomId: string): Promise<TeamChatRoom | null> {
  teamChatLog("fetchTeamChatRoom", { roomId });

  try {
    const path = `/api/team-chat/rooms/${encodeURIComponent(roomId)}`;
    teamChatLog("fetchTeamChatRoom", "trying API", path);
    const response = await api.get<TeamChatRoomSingleResponse>(path);
    const room = response?.room;
    if (!room) {
      teamChatLog("fetchTeamChatRoom", "API no room");
      return null;
    }
    teamChatLog("fetchTeamChatRoom done", { source: "API" });
    return normalizeRoom(room as Record<string, unknown>);
  } catch (e) {
    teamChatLog("fetchTeamChatRoom", "API failed", e instanceof Error ? e.message : e);
  }

  try {
    teamChatLog("fetchTeamChatRoom", "trying Supabase");
    const { data, error } = await supabase
      .from("team_chat_rooms")
      .select(ROOMS_SELECT)
      .eq("id", roomId)
      .single();

    if (error || !data) {
      teamChatLog("fetchTeamChatRoom", "Supabase", error?.message ?? "no data");
      return null;
    }
    teamChatLog("fetchTeamChatRoom done", { source: "Supabase" });
    return normalizeRoom(data as Record<string, unknown>);
  } catch (e) {
    teamChatLog("fetchTeamChatRoom failed", e instanceof Error ? e.message : e);
    return null;
  }
}

/** API response item: GET /api/team/members (users in current user's organization). */
type TeamMemberApiRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function normalizeTeamMember(row: TeamMemberApiRow): TeamChatUser {
  return {
    id: String(row.id ?? ""),
    email: row.email ?? null,
    full_name: row.full_name ?? null,
    avatar_url: row.avatar_url ?? null,
  };
}

/**
 * Fetch team members for "Add members" in New Conversation modal.
 * GET /api/team/members (users in current user's organization); fallback: derive from room members.
 */
export async function fetchTeamMembers(): Promise<TeamChatUser[]> {
  try {
    const response = await api.get<TeamMemberApiRow[]>("/api/team/members");
    const raw = Array.isArray(response) ? response : [];
    const list = raw.map((r) => normalizeTeamMember(r));
    if (list.length > 0) {
      teamChatLog("fetchTeamMembers done", { source: "API", count: list.length });
      return list;
    }
  } catch (e) {
    teamChatLog("fetchTeamMembers", "API failed", e instanceof Error ? e.message : e);
  }
  try {
    const { rooms } = await fetchTeamChatRooms({ limit: 100, page: 1 });
    const seen = new Set<string>();
    const users: TeamChatUser[] = [];
    for (const room of rooms) {
      for (const m of room.members ?? []) {
        const u = m.user;
        const id = u?.id ?? m.user_id;
        if (id && !seen.has(id)) {
          seen.add(id);
          users.push({
            id: String(id),
            full_name: u?.full_name ?? null,
            email: u?.email ?? null,
            avatar_url: u?.avatar_url ?? null,
          });
        }
      }
    }
    teamChatLog("fetchTeamMembers done", { source: "rooms", count: users.length });
    return users;
  } catch (e) {
    teamChatLog("fetchTeamMembers failed", e instanceof Error ? e.message : e);
    return [];
  }
}

export type CreateTeamChatRoomParams = {
  type: "direct" | "group" | "channel";
  name?: string;
  description?: string;
  member_ids?: string[];
};

/** Create a team chat room. POST /api/team-chat/rooms or Supabase insert. */
export async function createTeamChatRoom(params: CreateTeamChatRoomParams): Promise<TeamChatRoom | null> {
  try {
    const body: Record<string, unknown> = {
      type: params.type,
      name: params.name?.trim() || null,
      description: params.description?.trim() || null,
      member_ids: params.member_ids ?? [],
    };
    const response = await api.post<{ room: TeamChatRoom } | TeamChatRoom>("/api/team-chat/rooms", body);
    const room =
      response && typeof response === "object" && "room" in response
        ? (response as { room: TeamChatRoom }).room
        : (response as TeamChatRoom);
    if (room?.id) {
      teamChatLog("createTeamChatRoom done", { source: "API", roomId: room.id });
      return normalizeRoom(room as Record<string, unknown>);
    }
  } catch (e) {
    teamChatLog("createTeamChatRoom", "API failed", e instanceof Error ? e.message : e);
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return null;
    const now = new Date().toISOString();
    const orgId =
      (user?.user_metadata as { organization_id?: string })?.organization_id ??
      (user?.app_metadata as { organization_id?: string })?.organization_id ??
      null;
    const { data, error } = await supabase
      .from("team_chat_rooms")
      .insert({
        organization_id: orgId,
        type: params.type,
        name: params.name?.trim() || null,
        created_by: user.id,
        created_at: now,
        updated_at: now,
        is_archived: false,
      })
      .select(ROOMS_SELECT)
      .single();
    if (error || !data) {
      teamChatLog("createTeamChatRoom", "Supabase", error?.message ?? "no data");
      return null;
    }
    const memberIds = [user.id, ...(params.member_ids ?? [])].filter((id, i, a) => a.indexOf(id) === i);
    for (const memberId of memberIds) {
      await supabase.from("team_chat_room_members").insert({
        room_id: (data as { id: string }).id,
        user_id: memberId,
      });
    }
    teamChatLog("createTeamChatRoom done", { source: "Supabase" });
    return normalizeRoom(data as Record<string, unknown>);
  } catch (e) {
    teamChatLog("createTeamChatRoom failed", e instanceof Error ? e.message : e);
    return null;
  }
}
