import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryClient";
import { fetchContactsFromSupabase, getContactsCountFromSupabase } from "../lib/contactsApi";
import { getPendingContacts } from "../lib/offlineContacts";
import { toDisplayContact } from "../types/contacts";
import { contactsLog } from "../lib/logger";
import type { Contact } from "../types/contacts";

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/** Merge server contacts with local pending so newly created contacts show immediately. */
async function mergeWithPending(
  serverContacts: Contact[],
  userId: string,
  search?: string
): Promise<Contact[]> {
  const pendingRows = await getPendingContacts(userId);
  const pendingContacts = pendingRows.map((row) => toDisplayContact(row));
  const pendingPhones = new Set(
    pendingContacts.map((c) => normalizePhone(c.phone)).filter(Boolean)
  );
  const fromServer = serverContacts.filter(
    (c) => !pendingPhones.has(normalizePhone(c.phone))
  );
  const merged = [...pendingContacts, ...fromServer];
  merged.sort((a, b) => {
    const ta = a.created_at ?? "";
    const tb = b.created_at ?? "";
    return tb.localeCompare(ta);
  });
  if (!search?.trim()) return merged;
  const q = search.trim().toLowerCase();
  return merged.filter(
    (c) =>
      (c.first_name?.toLowerCase().includes(q)) ||
      (c.last_name?.toLowerCase().includes(q)) ||
      (c.phone?.toLowerCase().includes(q)) ||
      (c.email?.toLowerCase().includes(q)) ||
      (c.company?.toLowerCase().includes(q))
  );
}

// ─── Types (sample-app style) ───────────────────────────────────────────────

export interface ContactFilters {
  search?: string;
  status?: string;
  groupId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface ContactsResponse {
  contacts: Contact[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

type ContactsApiResponse =
  | ContactsResponse
  | { data: ContactsResponse }
  | { data: unknown[] }; // some APIs return { data: [...] }

function unwrapContactsResponse(response: ContactsApiResponse): ContactsResponse {
  if (response && typeof response === "object" && "contacts" in response && Array.isArray((response as ContactsResponse).contacts)) {
    return response as ContactsResponse;
  }
  if (response && typeof response === "object" && "data" in response) {
    const data = (response as { data: unknown }).data;
    if (data && typeof data === "object" && "contacts" in data && Array.isArray((data as ContactsResponse).contacts)) {
      return data as ContactsResponse;
    }
    if (Array.isArray(data)) {
      return { contacts: data as unknown as Contact[], pagination: undefined };
    }
  }
  return { contacts: [], pagination: undefined };
}

/** Map API contact (snake_case, optional fields) to app Contact (name, subtitle). */
function mapApiContactToContact(raw: {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}): Contact {
  const first = raw.first_name ?? "";
  const last = raw.last_name ?? "";
  const fullName = (raw.name ?? "").trim();
  const name =
    [first, last].filter(Boolean).join(" ") ||
    fullName ||
    (raw.phone ? String(raw.phone).trim() : "") ||
    "—";
  const parts = [raw.email, raw.phone].filter(Boolean) as string[];
  const subtitle = parts.length > 0 ? parts.join(" • ") : undefined;
  return {
    id: raw.id,
    first_name: first,
    last_name: last,
    phone: raw.phone ?? undefined,
    email: raw.email ?? undefined,
    company: raw.company ?? undefined,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    name,
    subtitle,
  };
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Fetch contacts list from API (sample-app style).
 * GET /contacts with optional search, pagination, and sort.
 */
/**
 * Fetch contacts: tries REST API (sample-app style) first, falls back to Supabase on failure.
 * So contacts show even when the API is missing or returns an error.
 */
export function useContacts(filters: ContactFilters = {}) {
  const { user, isAuthenticated } = useAuth();
  const {
    search,
    status,
    groupId,
    page = 1,
    limit = 50_000,
    sortBy,
    sortOrder,
  } = filters;

  const enabled = true;
  contactsLog("useContacts", {
    isAuthenticated,
    userId: user?.id ?? null,
    filters: { search, page, limit },
  });

  const CONTACTS_FETCH_TIMEOUT_MS = 4000;

  return useQuery({
    queryKey: queryKeys.contacts.list({
      search,
      status,
      groupId,
      page,
      limit,
      sortBy,
      sortOrder,
      userId: user?.id ?? "",
    }),
    queryFn: async () => {
      contactsLog("queryFn: start");
      const emptyResult = async (
        serverContacts: Contact[],
        totalCount?: number
      ): Promise<{ contacts: Contact[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean } }> => {
        const contacts = user?.id ? await mergeWithPending(serverContacts, user.id, search) : serverContacts;
        const total = totalCount ?? contacts.length;
        return {
          contacts,
          pagination: { page: 1, limit: contacts.length, total, totalPages: 1, hasMore: false },
        };
      };
      if (!isAuthenticated || !user?.id) {
        contactsLog("queryFn: not authenticated, returning empty");
        return emptyResult([]);
      }
      // Supabase-first: get total count then fetch all contacts (up to limit)
      try {
        const totalCount = await getContactsCountFromSupabase(user.id);
        const fetchLimit = Math.min(limit, Math.max(totalCount, 1));
        const serverContacts = await fetchContactsFromSupabase(user.id, search, fetchLimit);
        contactsLog("queryFn: Supabase result", { count: serverContacts.length, totalCount });
        const result = await emptyResult(serverContacts, totalCount);
        contactsLog("queryFn: done", { count: result.contacts.length, total: result.pagination.total });
        return result;
      } catch (supabaseError) {
        contactsLog("queryFn: Supabase failed, trying API", supabaseError instanceof Error ? supabaseError.message : supabaseError);
        try {
          const params = new URLSearchParams();
          if (search) params.set("search", search);
          if (status) params.set("status", status);
          if (groupId) params.set("group_id", groupId);
          params.set("page", String(page));
          params.set("limit", String(limit));
          if (sortBy) params.set("sort_by", sortBy);
          if (sortOrder) params.set("sort_order", sortOrder);
          const url = `/contacts?${params}`;
          const response = await api.get<ContactsApiResponse>(url);
          const { contacts: raw, pagination } = unwrapContactsResponse(response);
          const serverContacts = (raw ?? []).map(mapApiContactToContact);
          contactsLog("queryFn: API result", { count: serverContacts.length, pagination });
          const result = await emptyResult(serverContacts);
          return { ...result, pagination: pagination ?? result.pagination };
        } catch (apiError) {
          contactsLog("queryFn: API failed, returning empty", apiError instanceof Error ? apiError.message : apiError);
          return emptyResult([]);
        }
      }
    },
    enabled,
  });
}
