import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { queryKeys } from "../lib/queryClient";
import { fetchContactGroups, fetchContactGroupById } from "../lib/contactGroupsApi";
import type { ContactGroupDetailResponse } from "../lib/contactGroupsApi";

export function useContactGroups() {
  const { isAuthenticated } = useAuth();
  const { data: contactGroups = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.contactGroups.list(),
    queryFn: fetchContactGroups,
    enabled: isAuthenticated,
  });
  return { contactGroups, isLoading, error, refetch, isRefetching };
}

/** Get one group by id; set includeContacts true to load up to 100 contacts in the group. */
export function useContactGroup(id: string | null, includeContacts = false) {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.contactGroups.detail(id ?? "", includeContacts),
    queryFn: () => fetchContactGroupById(id!, includeContacts),
    enabled: isAuthenticated && !!id,
  });
  return {
    groupDetail: data ?? null,
    isLoading,
    error,
    refetch,
    isRefetching,
  } as {
    groupDetail: ContactGroupDetailResponse | null;
    isLoading: boolean;
    error: unknown;
    refetch: () => void;
    isRefetching: boolean;
  };
}
