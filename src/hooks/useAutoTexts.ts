import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { queryKeys } from "../lib/queryClient";
import { fetchAutoTexts } from "../lib/autoTextsApi";

export function useAutoTexts() {
  const { isAuthenticated } = useAuth();
  const { data: autoTexts = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.autoTexts.list(),
    queryFn: fetchAutoTexts,
    enabled: isAuthenticated,
  });
  return { autoTexts, isLoading, error, refetch };
}
