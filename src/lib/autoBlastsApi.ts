/**
 * Auto-blasts from HTTP API:
 * GET /api/auto-blasts (list, with variants + stats)
 * GET /api/auto-blasts/[id] (single, with variants)
 * GET /api/auto-blasts/[id]/runs (runs for one auto_blast)
 */

import { api } from "./api";
import type { AutoBlast, AutoBlastRun } from "../types/campaigns";

/** API list response: auto_blasts for current user's org, excluding status = 'canceled'. */
export type AutoBlastsListResponse = {
  auto_blasts: AutoBlast[];
};

/** API single auto_blast response. */
export type AutoBlastDetailResponse = {
  auto_blast: AutoBlast;
};

/** API runs response (up to 50, ordered by run_at desc). */
export type AutoBlastRunsResponse = {
  runs: AutoBlastRun[];
};

/**
 * List auto_blasts (scoped to current user's org and created_by).
 * Returns items with auto_blast_variants and stats; excludes status = 'canceled'.
 */
export async function fetchAutoBlasts(): Promise<AutoBlast[]> {
  const response = await api.get<AutoBlastsListResponse>("/api/auto-blasts");
  return response.auto_blasts ?? [];
}

/**
 * Fetch a single auto_blast by id (must match user's organization_id and created_by).
 * Includes auto_blast_variants.
 */
export async function fetchAutoBlast(id: string): Promise<AutoBlast | null> {
  const response = await api.get<AutoBlastDetailResponse>(`/api/auto-blasts/${id}`);
  return response.auto_blast ?? null;
}

/**
 * Fetch up to 50 auto_blast_runs for one auto_blast, ordered by run_at desc.
 */
export async function fetchAutoBlastRuns(autoBlastId: string): Promise<AutoBlastRun[]> {
  const response = await api.get<AutoBlastRunsResponse>(`/api/auto-blasts/${autoBlastId}/runs`);
  return response.runs ?? [];
}
