/**
 * Conversations and messages from API or Supabase.
 * Flow: Supabase conversations (user_id / owner_id) first, then build from contacts if empty, then API fallback.
 * API: GET /api/conversations (filters, pagination, lite), GET /api/messages?conversation_id=, POST /api/messages/send (body, media_urls)
 * Supabase: conversations, messages tables; or derive conversations from contacts (one per contact).
 */

import type { Conversation, Message, MessageStatus } from "../types/messages";
import { api } from "./api";
import { supabase } from "./supabase";
import { messagesLog } from "./logger";

const CONVERSATIONS_PAGE_SIZE = 200;

function mapToConversation(row: Record<string, unknown>): Conversation {
  // Prefer Supabase conversations columns: contact_first_name, contact_last_name, contact_phone, contact_avatar_url
  const contactFirst = String(row.contact_first_name ?? "").trim();
  const contactLast = String(row.contact_last_name ?? "").trim();
  const nameFromContact = [contactFirst, contactLast].filter(Boolean).join(" ").trim();
  const title =
    nameFromContact ||
    String(row.title ?? row.contact_name ?? row.name ?? row.participant_name ?? "").trim() ||
    (row.contact_id != null ? `Contact ${String(row.contact_id).slice(0, 8)}` : "") ||
    "—";
  const contactPhone = String(row.contact_phone ?? "").trim();
  const subtitle =
    contactPhone ||
    String(row.subtitle ?? row.phone ?? "").trim();
    const lastMessagePreviewRaw =
    row.last_message_preview ?? row.lastMessagePreview ?? row.last_message ?? row.preview ?? row.preview_text ?? row.message_preview ?? row.latest_message ?? "";
  const lastMessagePreview = (typeof lastMessagePreviewRaw === "string" ? lastMessagePreviewRaw : String(lastMessagePreviewRaw ?? "")).trim();
  const avatarUri = row.contact_avatar_url != null && row.contact_avatar_url !== ""
    ? String(row.contact_avatar_url)
    : null;
  return {
    id: String(row.id ?? ""),
    title: title || "—",
    subtitle,
    lastMessageAt: String(row.last_message_at ?? row.lastMessageAt ?? row.updated_at ?? new Date().toISOString()),
    lastMessagePreview: lastMessagePreview || "No messages yet",
    unreadCount: Number(row.unread_count ?? row.unreadCount ?? 0),
    contactId: row.contact_id != null ? String(row.contact_id) : row.contactId != null ? String(row.contactId) : null,
    avatarUri: avatarUri ?? undefined,
    organization_id: row.organization_id != null ? String(row.organization_id) : null,
    contact_id: row.contact_id != null ? String(row.contact_id) : null,
    phone_number_id: row.phone_number_id != null ? String(row.phone_number_id) : null,
    stats: row.stats ?? null,
    last_message_at: row.last_message_at != null ? String(row.last_message_at) : null,
    last_message_preview: row.last_message_preview != null ? String(row.last_message_preview) : null,
    unread_count: row.unread_count != null ? Number(row.unread_count) : null,
    assigned_to: row.assigned_to != null ? String(row.assigned_to) : null,
    created_at: row.created_at != null ? String(row.created_at) : null,
    updated_at: row.updated_at != null ? String(row.updated_at) : null,
    owner_id: row.owner_id != null ? String(row.owner_id) : null,
    contact_first_name: row.contact_first_name != null ? String(row.contact_first_name) : null,
    contact_last_name: row.contact_last_name != null ? String(row.contact_last_name) : null,
    contact_phone: row.contact_phone != null ? String(row.contact_phone) : null,
    contact_avatar_url: row.contact_avatar_url != null ? String(row.contact_avatar_url) : null,
    has_outbound: row.has_outbound != null ? Boolean(row.has_outbound) : null,
    has_inbound_reply: row.has_inbound_reply != null ? Boolean(row.has_inbound_reply) : null,
    archived: row.archived != null ? Boolean(row.archived) : null,
    stopped: row.stopped != null ? Boolean(row.stopped) : null,
  };
}

/** Single page of contacts (for fetchAll). */
async function fetchConversationsFromContactsPage(
  ownerId: string,
  offset: number
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, name, phone, email")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .range(offset, offset + CONVERSATIONS_PAGE_SIZE - 1);
  if (error || !data || data.length === 0) return [];
  const now = new Date().toISOString();
  return (data as Record<string, unknown>[]).map((row) => {
    const first = String(row.first_name ?? "").trim();
    const last = String(row.last_name ?? "").trim();
    const name = String(row.name ?? "").trim() || [first, last].filter(Boolean).join(" ") || String(row.phone ?? "").trim() || "—";
    const subtitle = [row.email, row.phone].filter(Boolean).map(String).join(" • ") || "";
    const contactId = String(row.id);
    return {
      id: `conv-${contactId}`,
      title: name,
      subtitle,
      lastMessageAt: now,
      lastMessagePreview: "",
      unreadCount: 0,
      contactId,
      organization_id: null,
      contact_id: contactId,
      phone_number_id: null,
      stats: null,
      last_message_at: null,
      last_message_preview: null,
      unread_count: 0,
      assigned_to: null,
      created_at: null,
      updated_at: null,
      owner_id: ownerId,
      contact_first_name: first || null,
      contact_last_name: last || null,
      contact_phone: row.phone != null ? String(row.phone) : null,
      contact_avatar_url: null,
      has_outbound: null,
      has_inbound_reply: null,
    };
  });
}

/** Fetch ALL conversations from contacts (paginate internally, then merge). */
async function fetchConversationsFromContactsAll(ownerId: string): Promise<Conversation[]> {
  messagesLog("fetchConversationsFromContactsAll", { ownerId: ownerId.slice(0, 8) + "..." });
  const all: Conversation[] = [];
  let offset = 0;
  let page: Conversation[];
  do {
    page = await fetchConversationsFromContactsPage(ownerId, offset);
    all.push(...page);
    offset += CONVERSATIONS_PAGE_SIZE;
  } while (page.length >= CONVERSATIONS_PAGE_SIZE);
  messagesLog("fetchConversationsFromContactsAll", "done", { total: all.length });
  return all;
}

/** Single page of Supabase conversations (for fetchAll). */
async function fetchConversationsFromSupabasePage(
  userId: string,
  column: "owner_id" | "user_id",
  offset: number,
  filterType: ConversationFilterType
): Promise<Conversation[] | null> {
  let q = supabase
    .from("conversations")
    .select("*")
    .eq(column, userId)
    .order("last_message_at", { ascending: false })
    .range(offset, offset + CONVERSATIONS_PAGE_SIZE - 1);
  if (filterType === "unread") q = q.gt("unread_count", 0);
  if (filterType === "archived") q = q.eq("archived", true);
  if (filterType === "stopped") q = q.eq("stopped", true);
  const { data, error } = await q;
  if (error || !data) return null;
  return (data as Record<string, unknown>[]).map(mapToConversation);
}

/** Fetch ALL conversations from Supabase (owner_id then user_id), then merge and return. */
async function fetchConversationsFromSupabaseAll(userId: string, filterType: ConversationFilterType = "all"): Promise<Conversation[]> {
  messagesLog("fetchConversationsFromSupabaseAll", { userId: userId.slice(0, 8) + "...", filterType });
  const tryColumnAll = async (column: "owner_id" | "user_id") => {
    const all: Conversation[] = [];
    let offset = 0;
    let page: Conversation[] | null;
    do {
      page = await fetchConversationsFromSupabasePage(userId, column, offset, filterType);
      if (page === null) return null;
      all.push(...page);
      offset += CONVERSATIONS_PAGE_SIZE;
    } while (page.length >= CONVERSATIONS_PAGE_SIZE);
    return all;
  };
  const byOwner = await tryColumnAll("owner_id");
  if (byOwner !== null) {
    messagesLog("fetchConversationsFromSupabaseAll", "done", { total: byOwner.length });
    return byOwner;
  }
  const byUser = await tryColumnAll("user_id");
  if (byUser !== null) {
    messagesLog("fetchConversationsFromSupabaseAll", "done", { total: byUser.length });
    return byUser;
  }
  return [];
}

/** One page of conversations from Supabase (tries owner_id then user_id). */
async function fetchConversationsFromSupabase(
  userId: string,
  offset: number,
  filterType: ConversationFilterType
): Promise<Conversation[]> {
  const byOwner = await fetchConversationsFromSupabasePage(userId, "owner_id", offset, filterType);
  if (byOwner !== null) return byOwner;
  const byUser = await fetchConversationsFromSupabasePage(userId, "user_id", offset, filterType);
  return byUser ?? [];
}

/** One page of conversations built from contacts (when no conversations table rows). */
async function fetchConversationsFromContacts(ownerId: string, offset: number): Promise<Conversation[]> {
  return fetchConversationsFromContactsPage(ownerId, offset);
}

/** Get total conversation count (for display). Tries Supabase conversations then contacts. */
export async function getConversationsCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return 0;
  try {
    const { count: byOwner, error: errOwner } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if (!errOwner && byOwner != null) {
      messagesLog("getConversationsCount", { source: "conversations_owner", count: byOwner });
      return byOwner;
    }
    const { count: byUser, error: errUser } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (!errUser && byUser != null) {
      messagesLog("getConversationsCount", { source: "conversations_user", count: byUser });
      return byUser;
    }
  } catch (e) {
    messagesLog("getConversationsCount conversations failed", e instanceof Error ? e.message : e);
  }
  try {
    const { count, error } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if (!error && count != null) {
      messagesLog("getConversationsCount", { source: "contacts", count });
      return count;
    }
  } catch (e) {
    messagesLog("getConversationsCount contacts failed", e instanceof Error ? e.message : e);
  }
  return 0;
}

function mapToMessage(row: Record<string, unknown>): Message {
  const direction = String(row.direction ?? "").toLowerCase();
  const isFromMe = row.is_from_me != null ? Boolean(row.is_from_me) : row.isFromMe != null ? Boolean(row.isFromMe) : direction === "outbound" || direction === "out";
  return {
    id: String(row.id ?? ""),
    conversationId: String(row.conversation_id ?? row.conversationId ?? ""),
    senderId: String(row.sender_id ?? row.senderId ?? ""),
    text: String(row.text ?? row.body ?? ""),
    sentAt: String(row.sent_at ?? row.sentAt ?? row.created_at ?? new Date().toISOString()),
    isFromMe,
    status: row.status as MessageStatus | undefined,
  };
}

/** Get sortable timestamp (ms) for conversation. When last_message_at is null/empty, return 0 so it sorts last. */
function getLastMessageTime(c: Conversation): number {
  const raw = c.last_message_at ?? "";
  if (raw === "" || raw == null) return 0;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export type ConversationFilterType = "all" | "unread" | "archived" | "stopped";

function applyConversationsFilters(
  list: Conversation[],
  search: string,
  filterType: ConversationFilterType
): Conversation[] {
  let out = list;
  if (filterType === "unread") out = out.filter((c) => c.unreadCount > 0);
  if (filterType === "archived") out = out.filter((c) => c.archived === true);
  if (filterType === "stopped") out = out.filter((c) => c.stopped === true);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    out = out.filter((c) => (c.title ?? "").toLowerCase().includes(q) || (c.subtitle ?? "").toLowerCase().includes(q));
  }
  // Order by last_message_at descending (most recent first)
  out = [...out].sort((a, b) => getLastMessageTime(b) - getLastMessageTime(a));
  return out;
}

export type FetchConversationsResult = { list: Conversation[]; rawCount: number };

export async function fetchConversations(
  _token: string,
  search: string,
  filterType: ConversationFilterType,
  offset: number = 0
): Promise<FetchConversationsResult> {
  messagesLog("fetchConversations", { search: search || "(none)", filterType, offset });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    messagesLog("fetchConversations", "not authenticated");
    const out = applyConversationsFilters([], search, filterType);
    return { list: out, rawCount: 0 };
  }

  // 1) Supabase conversations table (user_id then owner_id)
  let list: Conversation[] = [];
  let source: string | null = null;
  try {
    list = await fetchConversationsFromSupabase(user.id, offset, filterType);
    source = list.length > 0 ? "supabase_conversations" : null;
    // 2) If no conversations rows, build one conversation per contact (only when filter is all/unread; contacts have no archived/stopped)
    if (list.length === 0 && (filterType === "all" || filterType === "unread")) {
      list = await fetchConversationsFromContacts(user.id, offset);
      if (list.length > 0) source = "from_contacts";
    }
  } catch (e) {
    messagesLog("fetchConversations Supabase/contacts failed", e instanceof Error ? e.message : e);
  }
  const rawCount = list.length;
  if (list.length > 0) {
    const out = applyConversationsFilters(list, search, filterType);
    messagesLog("fetchConversations done", { source, rawCount, afterFilters: out.length });
    return { list: out, rawCount };
  }

  // 3) API fallback: GET /api/conversations with filters, pagination, lite=true. Response: { conversations, pagination }
  try {
    messagesLog("fetchConversations", "trying API");
    const params = new URLSearchParams();
    params.set("lite", "true");
    if (search.trim()) params.set("search", search.trim());
    if (filterType === "unread") params.set("unread", "true");
    if (filterType === "archived") params.set("status", "archived");
    if (filterType === "stopped") params.set("status", "stopped");
    if (filterType === "all") params.set("status", "active");
    params.set("limit", String(CONVERSATIONS_PAGE_SIZE));
    params.set("page", String(Math.floor(offset / CONVERSATIONS_PAGE_SIZE) + 1));
    const url = `/api/conversations?${params}`;
    const response = await api.get<{ conversations?: unknown[]; pagination?: unknown } | unknown>(url);
    const raw = response as { conversations?: unknown[]; data?: unknown[] };
    const rows: Record<string, unknown>[] =
      Array.isArray(raw?.conversations) ? raw.conversations as Record<string, unknown>[] :
      Array.isArray(raw?.data) ? raw.data as Record<string, unknown>[] :
      Array.isArray(response) ? (response as Record<string, unknown>[]) : [];
    list = rows.map(mapToConversation);
    // Only show conversations that belong to the logged-in user (owner or assigned to them)
    list = list.filter(
      (c) => c.owner_id === user.id || c.assigned_to === user.id
    );
    const out = applyConversationsFilters(list, search, filterType);
    // For pagination: use raw row count so we keep fetching pages; "stopped" filter is applied in out
    const apiRawCount = rows.length;
    messagesLog("fetchConversations done", { source: "api", rawCount: apiRawCount, afterFilters: out.length });
    return { list: out, rawCount: apiRawCount };
  } catch (e) {
    messagesLog("fetchConversations API failed", e instanceof Error ? e.message : e);
    return { list: [], rawCount: 0 };
  }
}

export async function fetchMessages(_token: string, conversationId: string): Promise<Message[]> {
  messagesLog("fetchMessages", { conversationId: conversationId.slice(0, 20) + (conversationId.length > 20 ? "..." : "") });
  try {
    const response = await api.get<{ messages?: unknown[] } | unknown>(`/api/messages?conversation_id=${encodeURIComponent(conversationId)}`);
    const raw = response as { messages?: unknown[]; data?: unknown[] };
    const rows: Record<string, unknown>[] =
      Array.isArray(raw?.messages) ? (raw.messages as Record<string, unknown>[]) :
      Array.isArray(raw?.data) ? (raw.data as Record<string, unknown>[]) :
      Array.isArray(response) ? (response as Record<string, unknown>[]) : [];
    const list = rows.map(mapToMessage);
    list.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    messagesLog("fetchMessages done", { source: "api", count: list.length });
    return list;
  } catch {
    try {
      const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("sent_at", { ascending: true });
      if (error || !data) {
        messagesLog("fetchMessages Supabase", error?.message ?? "no data");
        return [];
      }
      const list = (data as Record<string, unknown>[]).map((r) => mapToMessage(r));
      messagesLog("fetchMessages done", { source: "supabase", count: list.length });
      return list;
    } catch (e) {
      messagesLog("fetchMessages failed", e instanceof Error ? e.message : e);
      return [];
    }
  }
}

function normalizeMessageRow(row: Record<string, unknown>, conversationId: string, isFromMe?: boolean): Message {
  const msg = mapToMessage(row);
  if (isFromMe !== undefined) {
    return { ...msg, isFromMe };
  }
  return msg;
}

export async function sendMessage(
  _token: string,
  conversationId: string,
  text: string,
  options?: { mediaUrls?: string[]; idempotencyKey?: string; fromPhoneNumberId?: string }
): Promise<Message> {
  messagesLog("sendMessage", { conversationId: conversationId.slice(0, 20) + "...", textLength: text.length });
  try {
    const body: Record<string, unknown> = {
      conversation_id: conversationId,
      body: text,
    };
    if (options?.mediaUrls?.length) body.media_urls = options.mediaUrls;
    if (options?.idempotencyKey) body.idempotency_key = options.idempotencyKey;
    if (options?.fromPhoneNumberId) body.from_phone_number_id = options.fromPhoneNumberId;
    const response = await api.post<Record<string, unknown>>("/api/messages/send", body);
    if (!response || typeof response !== "object") throw new Error("Invalid response");
    const res = response as Record<string, unknown>;
    const data = res.data as Record<string, unknown> | undefined;
    const row =
      (data?.message as Record<string, unknown> | undefined) ??
      (res.message as Record<string, unknown> | undefined) ??
      (data as Record<string, unknown>) ??
      ("id" in res ? res : undefined);
    if (row && typeof row === "object") {
      const msg = normalizeMessageRow(row as Record<string, unknown>, conversationId, true);
      messagesLog("sendMessage done", { source: "api", messageId: msg.id });
      return msg;
    }
    throw new Error("Invalid response");
  } catch {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Not authenticated");
    const { data, error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, text }).select().single();
    if (error || !data) throw new Error(error?.message ?? "Failed to send");
    const msg = normalizeMessageRow(data as Record<string, unknown>, conversationId, true);
    messagesLog("sendMessage done", { source: "supabase", messageId: msg.id });
    return msg;
  }
}
