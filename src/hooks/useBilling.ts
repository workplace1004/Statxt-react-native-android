import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { queryKeys } from "../lib/queryClient";
import { fetchBillingUsage } from "../lib/billingApi";

export function useBillingUsage() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.billing.usage(),
    queryFn: fetchBillingUsage,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
  const messagingRates = data?.messagingRates;
  const outboundCentsPerSegment =
    typeof messagingRates?.outbound_cents_per_segment === "number"
      ? messagingRates.outbound_cents_per_segment
      : null;
  return {
    usage: data?.usage,
    credits: data?.credits,
    messagingRates,
    outboundCentsPerSegment,
    isLoading,
  };
}
