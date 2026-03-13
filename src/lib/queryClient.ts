import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export const queryKeys = {
  contacts: {
    all: ["contacts"] as const,
    lists: () => [...queryKeys.contacts.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.contacts.lists(), filters] as const,
    details: () => [...queryKeys.contacts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.contacts.details(), id] as const,
    search: (query: string) => [...queryKeys.contacts.all, "search", query] as const,
  },
  contactGroups: {
    all: ["contactGroups"] as const,
    list: () => [...queryKeys.contactGroups.all, "list"] as const,
    detail: (id: string, includeContacts?: boolean) =>
      [...queryKeys.contactGroups.all, "detail", id, includeContacts ?? false] as const,
  },
  campaigns: {
    all: ["campaigns"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.campaigns.all, "list", params ?? {}] as const,
    detail: (id: string) => [...queryKeys.campaigns.all, "detail", id] as const,
    stats: (id: string) => [...queryKeys.campaigns.all, "stats", id] as const,
  },
  autoTexts: {
    all: ["autoTexts"] as const,
    list: () => [...queryKeys.autoTexts.all, "list"] as const,
  },
  autoBlasts: {
    all: ["autoBlasts"] as const,
    list: () => [...queryKeys.autoBlasts.all, "list"] as const,
    detail: (id: string) => [...queryKeys.autoBlasts.all, "detail", id] as const,
    runs: (id: string) => [...queryKeys.autoBlasts.all, "runs", id] as const,
  },
  teamThreads: {
    all: ["teamThreads"] as const,
    list: () => [...queryKeys.teamThreads.all, "list"] as const,
  },
  teamChatMessages: {
    all: ["teamChatMessages"] as const,
    list: (roomId?: string) =>
      [...queryKeys.teamChatMessages.all, "list", roomId ?? "all"] as const,
  },
  templates: {
    all: ["templates"] as const,
    list: (category?: string) =>
      [...queryKeys.templates.all, "list", category ?? ""] as const,
    detail: (id: string) => [...queryKeys.templates.all, "detail", id] as const,
  },
  billing: {
    all: ["billing"] as const,
    usage: () => [...queryKeys.billing.all, "usage"] as const,
  },
};
