import { useEffect } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { fetchConversations, getConversationsCount } from "../lib/messagesApi";
import { messagesLog } from "../lib/logger";
import type { Conversation } from "../types/messages";
import type { ConversationFilterType } from "../lib/messagesApi";

const CONVERSATIONS_QUERY_KEY = "conversations";
const CONVERSATIONS_PAGE_SIZE = 200;

function formatTimeForLog(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60 * 60 * 1000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 24 * 60 * 60 * 1000) return "1d";
  if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + "d";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitialsForLog(title: string): string {
  const parts = (title ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return (title ?? "?").slice(0, 2).toUpperCase() || "?";
}

/** Log each conversation's display data (same as shown on Messages page). */
function logMessagesPageDisplayData(list: Conversation[]) {
  messagesLog("messages page display data (total)", list.length);
  list.forEach((item, index) => {
    const displayPayload = {
      index: index + 1,
      id: item.id,
      organization_id: item.organization_id ?? null,
      contact_id: item.contact_id ?? null,
      phone_number_id: item.phone_number_id ?? null,
      stats: item.stats ?? null,
      last_message_at: item.last_message_at ?? null,
      last_message_preview: item.last_message_preview ?? null,
      unread_count: item.unread_count ?? null,
      assigned_to: item.assigned_to ?? null,
      created_at: item.created_at ?? null,
      updated_at: item.updated_at ?? null,
      owner_id: item.owner_id ?? null,
      contact_first_name: item.contact_first_name ?? null,
      contact_last_name: item.contact_last_name ?? null,
      contact_phone: item.contact_phone ?? null,
      contact_avatar_url: item.contact_avatar_url ?? null,
      has_outbound: item.has_outbound ?? null,
      has_inbound_reply: item.has_inbound_reply ?? null,
    };
    messagesLog(`messages page row ${index + 1}`, displayPayload);
  });
}

export function useConversations(search: string, filterType: ConversationFilterType) {
  const { token, isAuthenticated } = useAuth();

  const countQuery = useQuery({
    queryKey: [CONVERSATIONS_QUERY_KEY, "count"],
    queryFn: getConversationsCount,
    enabled: isAuthenticated,
  });
  const totalCount = countQuery.data ?? null;

  const infinite = useInfiniteQuery({
    queryKey: [CONVERSATIONS_QUERY_KEY, search, filterType],
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      messagesLog("useConversations queryFn", { search: search || "(none)", filterType, offset });
      const { list, rawCount } = await fetchConversations(token ?? "", search, filterType, offset);
      messagesLog("useConversations result", { offset, listCount: list.length, rawCount });
      if (offset === 0) logMessagesPageDisplayData(list);
      return { list, rawCount };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const rawCount = (lastPage as { list: Conversation[]; rawCount: number })?.rawCount ?? 0;
      const pages = allPages ?? [];
      return rawCount >= CONVERSATIONS_PAGE_SIZE ? pages.length * CONVERSATIONS_PAGE_SIZE : undefined;
    },
  });

  const conversations: Conversation[] = (infinite.data?.pages ?? []).flatMap(
    (p) => (p as { list: Conversation[]; rawCount: number }).list ?? []
  );

  // When Stopped or Archived: load all pages so we show every conversation (not just the first page)
  const shouldLoadAllPages = filterType === "stopped" || filterType === "archived";
  useEffect(() => {
    if (!shouldLoadAllPages || !infinite.hasNextPage || infinite.isFetchingNextPage) return;
    infinite.fetchNextPage();
  }, [shouldLoadAllPages, infinite.hasNextPage, infinite.isFetchingNextPage, infinite.fetchNextPage]);

  return {
    data: conversations,
    conversations,
    totalCount,
    isLoading: infinite.isLoading,
    error: infinite.error,
    refetch: () => Promise.all([infinite.refetch(), countQuery.refetch()]),
    isRefetching: infinite.isRefetching,
    fetchNextPage: infinite.fetchNextPage,
    hasNextPage: infinite.hasNextPage,
    isFetchingNextPage: infinite.isFetchingNextPage,
  };
}
