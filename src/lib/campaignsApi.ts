/**
 * Campaigns from HTTP API (GET /api/campaigns, GET /api/campaigns/[id])
 * with optional Supabase fallback using organization_id + created_by.
 */

import { api } from "./api";
import { supabase } from "./supabase";
import type {
  Campaign,
  CampaignStatus,
  CampaignPhoneNumber,
  CampaignCreator,
  CampaignRecipient,
} from "../types/campaigns";

/** Query params for list campaigns. */
export type CampaignListParams = {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  exclude_auto_blast?: 0 | 1;
};

/** API list response. */
export type CampaignListResponse = {
  campaigns: Campaign[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

/** API single campaign response. */
export type CampaignDetailResponse = {
  campaign: Campaign;
};

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  sent_at?: string;
  recipient_count?: number;
  sent_count?: number;
  delivered_percent?: number;
  response_percent?: number;
  completed_at?: string;
  delivered_count?: number;
  failed_count?: number;
  pending_count?: number;
  replies_count?: number;
  opt_out_count?: number;
  opt_out_rate?: number;
  message_text?: string;
  message_body?: string;
  message_body_b?: string;
  created_at?: string;
  started_at?: string;
  phone_numbers?: Array<{ phone: string; friendly_name?: string }>;
  users?: CampaignCreator;
  creator?: CampaignCreator;
  campaign_recipients?: Array<{
    id: string;
    phone: string;
    status?: string;
    processed_at?: string;
    error_message?: string | null;
    skip_reason?: string | null;
  }>;
  [key: string]: unknown;
};

/** Read number from row with snake_case or camelCase (API may return either). */
function num(row: CampaignRow, snake: string, camel: string): number | undefined {
  const v = (row as Record<string, unknown>)[snake] ?? (row as Record<string, unknown>)[camel];
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function mapRowToCampaign(row: CampaignRow): Campaign {
  const phoneNumbers: CampaignPhoneNumber[] | undefined = row.phone_numbers?.length
    ? row.phone_numbers.map((p) => ({ phone: p.phone, friendly_name: p.friendly_name }))
    : undefined;
  const creator: CampaignCreator | undefined =
    row.users ?? row.creator
      ? { full_name: (row.users ?? row.creator)?.full_name, email: (row.users ?? row.creator)?.email }
      : undefined;
  const rawRecipients = row.campaign_recipients ?? (row as Record<string, unknown>).campaign_recipients;
  const recipients: CampaignRecipient[] | undefined = Array.isArray(rawRecipients) && rawRecipients.length > 0
    ? rawRecipients.map((r: Record<string, unknown>) => ({
        id: String(r.id ?? ""),
        phone: String(r.phone ?? ""),
        status: r.status as string | undefined,
        processed_at: r.processed_at as string | undefined,
        error_message: r.error_message as string | null | undefined,
        skip_reason: r.skip_reason as string | null | undefined,
      }))
    : undefined;

  const recipientCount = num(row, "recipient_count", "recipientCount") ?? (recipients?.length ?? 0);
  const sentCount = num(row, "sent_count", "sentCount");
  const deliveredCount = num(row, "delivered_count", "deliveredCount");
  const failedCount = num(row, "failed_count", "failedCount");
  const pendingCount = num(row, "pending_count", "pendingCount");
  const repliesCount = num(row, "replies_count", "repliesCount");
  const optOutCount = num(row, "opt_out_count", "optOutCount");

  const isSentOrDelivered = (s: string | undefined) =>
    s === "sent" || s === "delivered" || s === "completed";
  const sent =
    sentCount ??
    (recipients ? recipients.filter((r) => isSentOrDelivered(r.status)).length : 0);
  const delivered = deliveredCount ?? sent;
  const total = recipientCount || (recipients?.length ?? 0);
  const deliveredPercent = num(row, "delivered_percent", "deliveredPercent")
    ?? (total > 0 ? Math.round((delivered / total) * 1000) / 10 : undefined);
  const responsePercent = num(row, "response_percent", "responsePercent");
  const optOutRate = num(row, "opt_out_rate", "optOutRate");

  const sentAt = (row.sent_at ?? (row as Record<string, unknown>).sentAt) as string | undefined;
  const completedAt = (row.completed_at ?? (row as Record<string, unknown>).completedAt) as string | undefined;
  const createdAt = (row.created_at ?? (row as Record<string, unknown>).createdAt) as string | undefined;
  const startedAt = (row.started_at ?? (row as Record<string, unknown>).startedAt) as string | undefined;
  const messageText = (row.message_text ?? row.message_body ?? (row as Record<string, unknown>).messageText ?? (row as Record<string, unknown>).message_body) as string | undefined;

  return {
    id: row.id,
    name: (row.name ?? (row as Record<string, unknown>).name ?? "") as string,
    status: (row.status ?? "draft") as CampaignStatus,
    sentAt: sentAt ?? undefined,
    recipientCount: total,
    sentCount: sent ?? (recipients ? recipients.filter((r) => r.status && r.status !== "pending").length : undefined),
    deliveredPercent: deliveredPercent ?? undefined,
    responsePercent: responsePercent ?? undefined,
    completedAt: completedAt ?? undefined,
    deliveredCount: delivered ?? undefined,
    failedCount: failedCount ?? undefined,
    pendingCount: pendingCount ?? (recipients ? recipients.filter((r) => r.status === "pending").length : undefined),
    repliesCount: repliesCount ?? undefined,
    optOutCount: optOutCount ?? undefined,
    optOutRate: optOutRate ?? undefined,
    messageText: messageText ?? undefined,
    createdAt: createdAt ?? undefined,
    startedAt: startedAt ?? undefined,
    ...(phoneNumbers && { phone_numbers: phoneNumbers }),
    ...(creator && { creator }),
    ...(recipients && { campaign_recipients: recipients }),
  };
}

function buildListQuery(params?: CampaignListParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.status != null && params.status !== "all") search.set("status", params.status);
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.exclude_auto_blast === 1) search.set("exclude_auto_blast", "1");
  const q = search.toString();
  return q ? `?${q}` : "";
}

/**
 * List campaigns: GET /api/campaigns?status=...&search=...&page=1&limit=20&exclude_auto_blast=1
 * Response: { campaigns, pagination: { page, limit, total, totalPages } }
 */
export async function fetchCampaigns(params?: CampaignListParams): Promise<CampaignListResponse> {
  const query = buildListQuery(params);
  try {
    const response = await api.get<CampaignListResponse>(`/api/campaigns${query}`);
    const raw = response.campaigns;
    const campaigns = Array.isArray(raw) ? raw : [];
    const pagination = response.pagination ?? {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      total: campaigns.length,
      totalPages: 1,
    };
    const mapped = campaigns.map((c) => mapRowToCampaign(c as CampaignRow));
    return { campaigns: mapped, pagination };
  } catch {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return { campaigns: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      const orgId =
        (user as { organization_id?: string }).organization_id ??
        (user?.user_metadata as { organization_id?: string } | undefined)?.organization_id ??
        (user?.app_metadata as { organization_id?: string } | undefined)?.organization_id ??
        "";
      let q = supabase
        .from("campaigns")
        .select("*, phone_numbers(phone, friendly_name), users!created_by(full_name)", { count: "estimated" })
        .eq("organization_id", orgId)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (params?.status != null && params.status !== "all")
        q = q.eq("status", params.status);
      if (params?.exclude_auto_blast === 1) q = q.is("auto_blast_id", null);
      if (params?.search?.trim()) {
        const s = `%${params.search.trim()}%`;
        q = q.or(`name.ilike.${s},message_body.ilike.${s},message_body_b.ilike.${s}`);
      }
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const offset = (page - 1) * limit;
      const { data, error, count } = await q.range(offset, offset + limit - 1);
      if (error || !data) return { campaigns: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      const total = typeof count === "number" ? count : data.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const mapped = (data as CampaignRow[]).map(mapRowToCampaign);
      return { campaigns: mapped, pagination: { page, limit, total, totalPages } };
    } catch {
      return { campaigns: [], pagination: { page: params?.page ?? 1, limit: params?.limit ?? 20, total: 0, totalPages: 0 } };
    }
  }
}

/**
 * Single campaign: GET /api/campaigns/[id]
 * Response: { campaign } with phone_numbers, creator, campaign_recipients.
 */
export async function fetchCampaignById(id: string): Promise<Campaign | null> {
  try {
    const response = await api.get<CampaignDetailResponse>(`/api/campaigns/${id}`);
    const row = response?.campaign;
    return row ? mapRowToCampaign(row as CampaignRow) : null;
  } catch {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return null;
      const orgId =
        (user as { organization_id?: string }).organization_id ??
        (user?.user_metadata as { organization_id?: string } | undefined)?.organization_id ??
        (user?.app_metadata as { organization_id?: string } | undefined)?.organization_id ??
        "";
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          "*, phone_numbers(phone, friendly_name), users!created_by(full_name, email), campaign_recipients(id, phone, status, processed_at, error_message, skip_reason)"
        )
        .eq("id", id)
        .eq("organization_id", orgId)
        .eq("created_by", user.id)
        .single();
      if (error || !data) return null;
      return mapRowToCampaign(data as CampaignRow);
    } catch {
      return null;
    }
  }
}

/** GET /api/campaigns/[id]/stats – counts, analytics, recent activity (matches web). */
export type CampaignStatsResponse = {
  counts?: { total?: number; pending?: number; processing?: number; sent?: number; delivered?: number; failed?: number; skipped?: number };
  delivery_rate?: number;
  analytics?: {
    replies?: number;
    opt_outs?: number;
    cost_total?: number;
    avg_delivery_time?: number | null;
    response_rate?: number;
    opt_out_rate?: number;
    sentiment?: { positive?: number; negative?: number; neutral?: number };
  };
  recent?: Array<{ id: string; phone: string; status?: string; processed_at?: string | null; error_message?: string | null; variant?: string }>;
};

export async function fetchCampaignStats(campaignId: string): Promise<CampaignStatsResponse | null> {
  try {
    const raw = await api.get<CampaignStatsResponse | { data?: CampaignStatsResponse }>(
      `/api/campaigns/${campaignId}/stats`
    );
    const response = raw && typeof raw === "object" && "data" in raw && raw.data
      ? (raw.data as CampaignStatsResponse)
      : (raw as CampaignStatsResponse);
    if (!response || typeof response !== "object") return null;
    // Normalize: some backends put counts at top level; ensure we always have counts from response
    const r = response as Record<string, unknown>;
    const counts = (response.counts ?? r.counts) as CampaignStatsResponse["counts"] | undefined;
    const analytics = (response.analytics ?? r.analytics) as CampaignStatsResponse["analytics"] | undefined;
    const delivery_rate = response.delivery_rate ?? r.delivery_rate;
    const recent = response.recent ?? r.recent;
    return {
      ...response,
      counts: counts ?? {},
      analytics: analytics ?? response.analytics ?? {},
      delivery_rate: typeof delivery_rate === "number" ? delivery_rate : response.delivery_rate,
      recent: Array.isArray(recent) ? recent : response.recent,
    } as CampaignStatsResponse;
  } catch {
    return null;
  }
}

/** Active phone number for sending. GET /api/phone-numbers?status=active&limit=1 */
export type PhoneNumberRow = { id: string; phone: string; status?: string; friendly_name?: string };

export type PhoneNumbersListResponse = {
  phone_numbers?: PhoneNumberRow[];
  data?: PhoneNumberRow[];
};

export async function getActivePhoneNumber(): Promise<PhoneNumberRow | null> {
  const response = await api.get<PhoneNumbersListResponse>(
    "/api/phone-numbers?status=active&limit=1"
  );
  const list = response.phone_numbers ?? response.data ?? [];
  const first = Array.isArray(list) ? list[0] : null;
  return first ?? null;
}

/** Create campaign (text blaster). POST /api/campaigns */
export type CreateCampaignBody = {
  name?: string;
  message_body: string;
  message_body_b?: string;
  ab_mode?: boolean;
  media_urls?: string[];
  group_ids: string[];
  phone_number_id: string;
  scheduled_at?: string | null;
  category?: string;
};

export type CreateCampaignResponse = { campaign: { id: string; [key: string]: unknown } };

export async function createCampaign(body: CreateCampaignBody): Promise<CreateCampaignResponse> {
  return api.post<CreateCampaignResponse>("/api/campaigns", body);
}

/** Start sending campaign. POST /api/campaigns/[id]/send. Returns { queued?: true } on 202. */
export type StartCampaignSendResponse = { queued?: boolean };

export async function startCampaignSend(campaignId: string): Promise<StartCampaignSendResponse> {
  return api.post<StartCampaignSendResponse>(`/api/campaigns/${campaignId}/send`, {});
}
