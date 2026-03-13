/**
 * Billing usage for campaign cost (outbound_cents_per_segment).
 * GET /api/billing/usage – same as web.
 */

import { api } from "./api";

export type BillingUsageResponse = {
  usage?: unknown;
  credits?: unknown;
  messagingRates?: {
    outbound_cents_per_segment?: number;
    inbound_cents_per_segment?: number;
  };
  usageMeta?: unknown;
};

export async function fetchBillingUsage(): Promise<BillingUsageResponse> {
  const raw = await api.get<BillingUsageResponse>("/api/billing/usage");
  return raw ?? {};
}
