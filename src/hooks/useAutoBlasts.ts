import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { queryKeys } from "../lib/queryClient";
import {
  fetchAutoBlasts,
  fetchAutoBlast,
  fetchAutoBlastRuns,
} from "../lib/autoBlastsApi";

/** List auto_blasts (GET /api/auto-blasts), with variants and stats. */
export function useAutoBlasts() {
  const { isAuthenticated } = useAuth();
  const { data: autoBlasts = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.autoBlasts.list(),
    queryFn: fetchAutoBlasts,
    enabled: isAuthenticated,
  });
  return { autoBlasts, isLoading, error, refetch };
}

/** Single auto_blast by id (GET /api/auto-blasts/[id]). */
export function useAutoBlast(id: string | null) {
  const { isAuthenticated } = useAuth();
  const { data: autoBlast, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.autoBlasts.detail(id ?? ""),
    queryFn: () => fetchAutoBlast(id!),
    enabled: isAuthenticated && !!id,
  });
  return { autoBlast: autoBlast ?? null, isLoading, error, refetch };
}

/** Runs for one auto_blast (GET /api/auto-blasts/[id]/runs). */
export function useAutoBlastRuns(autoBlastId: string | null) {
  const { isAuthenticated } = useAuth();
  const { data: runs = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.autoBlasts.runs(autoBlastId ?? ""),
    queryFn: () => fetchAutoBlastRuns(autoBlastId!),
    enabled: isAuthenticated && !!autoBlastId,
  });
  return { runs, isLoading, error, refetch };
}
