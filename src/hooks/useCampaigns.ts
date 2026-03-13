import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { queryKeys } from "../lib/queryClient";
import {
  fetchCampaigns,
  fetchCampaignById,
  fetchCampaignStats,
  type CampaignListParams,
} from "../lib/campaignsApi";
import type { Campaign } from "../types/campaigns";

const defaultPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

/** Build list params for query key (excludes page so infinite pages share the same key). */
function listKeyParams(params?: CampaignListParams) {
  if (!params) return {};
  const { page: _page, ...rest } = params;
  return rest;
}

const PAGE_SIZE = 20;

export function useCampaigns(params?: CampaignListParams) {
  const { isAuthenticated } = useAuth();
  const limit = params?.limit ?? PAGE_SIZE;
  const listParams = { ...params, limit };
  const infinite = useInfiniteQuery({
    queryKey: queryKeys.campaigns.list(listKeyParams(listParams)),
    queryFn: ({ pageParam }) =>
      fetchCampaigns({ ...listParams, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: isAuthenticated,
  });
  const campaigns: Campaign[] =
    infinite.data?.pages.flatMap((p) => p.campaigns) ?? [];
  const pagination =
    (infinite.data?.pages?.length ?? 0) > 0
      ? infinite.data!.pages[infinite.data.pages.length - 1].pagination
      : defaultPagination;
  return {
    campaigns,
    pagination,
    isLoading: infinite.isLoading,
    error: infinite.error,
    refetch: infinite.refetch,
    fetchNextPage: infinite.fetchNextPage,
    hasNextPage: infinite.hasNextPage ?? false,
    isFetchingNextPage: infinite.isFetchingNextPage,
  };
}

export function useCampaign(campaignId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const { data: campaign, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.campaigns.detail(campaignId ?? ""),
    queryFn: () => fetchCampaignById(campaignId!),
    enabled: isAuthenticated && !!campaignId,
  });
  return { campaign: campaign ?? null, isLoading, error, refetch, isRefetching };
}

export function useCampaignStats(campaignId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: queryKeys.campaigns.stats(campaignId ?? ""),
    queryFn: () => fetchCampaignStats(campaignId!),
    enabled: isAuthenticated && !!campaignId,
  });
  return { stats: stats ?? null, isLoading, refetch };
}
