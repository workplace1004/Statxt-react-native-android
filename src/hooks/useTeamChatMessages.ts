import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { queryKeys } from "../lib/queryClient";
import {
  fetchTeamChatMessages,
  sendTeamChatMessage,
  type TeamChatMessagesOptions,
} from "../lib/teamChatMessagesApi";
import type { TeamChatMessage } from "../types/teamChat";

/** Match API default so one page shows full room (e.g. all 24 messages). */
const DEFAULT_LIMIT = 200;
const DIRECTION: "older" | "newer" = "older";

/**
 * Fetches team chat messages for a room. Prefers GET /api/team-chat/rooms/[id]/messages;
 * falls back to Supabase team_chat_messages with sender, reactions, attachments.
 * Supports cursor-based pagination (load older/newer).
 */
export function useTeamChatMessages(roomId: string | undefined, options?: Partial<TeamChatMessagesOptions>) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const limit = options?.limit ?? DEFAULT_LIMIT;

  const infinite = useInfiniteQuery({
    queryKey: [...queryKeys.teamChatMessages.list(roomId), limit, options?.direction ?? DIRECTION],
    queryFn: async ({ pageParam }) => {
      const result = await fetchTeamChatMessages(roomId!, {
        ...options,
        limit,
        direction: options?.direction ?? DIRECTION,
        cursor: pageParam as string | null | undefined,
      });
      return result;
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.cursor : undefined,
    initialPageParam: null as string | null,
    enabled: isAuthenticated && Boolean(roomId),
  });

  const messages: TeamChatMessage[] =
    infinite.data?.pages.flatMap((p) => p.messages) ?? [];
  const pagination = infinite.data?.pages[infinite.data.pages.length - 1]?.pagination;

  const sendMutation = useMutation({
    mutationFn: (payload: string | { text: string; attachmentUrl?: string; replyToId?: string | null }) => {
      const text = typeof payload === "string" ? payload : payload.text;
      const attachmentUrl = typeof payload === "string" ? undefined : payload.attachmentUrl;
      const replyToId = typeof payload === "string" ? undefined : payload.replyToId;
      return sendTeamChatMessage(roomId!, text, {
        ...(attachmentUrl ? { attachmentUrl } : {}),
        ...(replyToId ? { replyToId } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teamChatMessages.list(roomId) });
    },
  });

  return {
    messages,
    pagination: pagination ?? { cursor: null, hasMore: false, limit },
    isLoading: infinite.isLoading,
    error: infinite.error,
    refetch: infinite.refetch,
    isRefetching: infinite.isRefetching,
    fetchNextPage: infinite.fetchNextPage,
    hasNextPage: infinite.hasNextPage,
    isFetchingNextPage: infinite.isFetchingNextPage,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
  };
}
