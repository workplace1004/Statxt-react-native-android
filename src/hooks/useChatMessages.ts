import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { fetchMessages, sendMessage } from "../lib/messagesApi";
import { messagesLog } from "../lib/logger";
import type { Message } from "../types/messages";

const CHAT_QUERY_KEY = "chat";
const OPTIMISTIC_ID_PREFIX = "temp-";

export function useChatMessages(conversationId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CHAT_QUERY_KEY, conversationId],
    queryFn: async () => {
      messagesLog("useChatMessages queryFn", { conversationId });
      const list = await fetchMessages(token ?? "", conversationId);
      messagesLog("useChatMessages result", { conversationId, count: list.length });
      return list;
    },
    enabled: !!conversationId,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      sendMessage(token ?? "", conversationId, text),
    onMutate: async (text: string) => {
      const optimistic: Message = {
        id: `${OPTIMISTIC_ID_PREFIX}${Date.now()}`,
        conversationId,
        senderId: "",
        text,
        sentAt: new Date().toISOString(),
        isFromMe: true,
        status: "sending",
      };
      await queryClient.cancelQueries({ queryKey: [CHAT_QUERY_KEY, conversationId] });
      const prev = queryClient.getQueryData<Message[]>([CHAT_QUERY_KEY, conversationId]);
      queryClient.setQueryData<Message[]>(
        [CHAT_QUERY_KEY, conversationId],
        (old) => (old ? [...old, optimistic] : [optimistic])
      );
      return { prev };
    },
    onSuccess: (newMessage: Message, _text, _context) => {
      queryClient.setQueryData<Message[]>(
        [CHAT_QUERY_KEY, conversationId],
        (prev) => {
          if (!prev) return [newMessage];
          const withoutOptimistic = prev.filter((m) => !m.id.startsWith(OPTIMISTIC_ID_PREFIX));
          return [...withoutOptimistic, newMessage];
        }
      );
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (_err, _text, context) => {
      if (context?.prev != null) {
        queryClient.setQueryData([CHAT_QUERY_KEY, conversationId], context.prev);
      }
    },
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
    sendError: sendMutation.error,
    clearSendError: sendMutation.reset,
  };
}
