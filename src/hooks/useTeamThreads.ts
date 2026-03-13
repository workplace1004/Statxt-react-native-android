import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { queryKeys } from "../lib/queryClient";
import { teamChatLog } from "../lib/logger";
import { fetchTeamThreads } from "../lib/teamThreadsApi";

export function useTeamThreads() {
  const { isAuthenticated } = useAuth();
  const { data: teamThreads = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.teamThreads.list(),
    queryFn: async () => {
      teamChatLog("useTeamThreads queryFn");
      const list = await fetchTeamThreads();
      teamChatLog("useTeamThreads result", { count: list.length });
      return list;
    },
    enabled: isAuthenticated,
  });
  return { teamThreads, isLoading, error, refetch, isRefetching };
}
