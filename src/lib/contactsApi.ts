/**
 * Contacts from Supabase (public.contacts).
 * Schema aligns with contactsSync.ts: owner_id, first_name, last_name, phone, email, company, created_at, updated_at.
 * Optional: status, tags (from Supabase if present).
 */

import { supabase } from "./supabase";
import { contactsLog } from "./logger";
import type { Contact } from "../types/contacts";

/** Supabase contacts table row (minimal set used by sync + common columns). */
export type SupabaseContactRow = {
  id: string;
  owner_id: string | null;
  first_name: string | null;
  last_name: string | null;
  /** Optional full display name (e.g. from imports when first/last are empty). */
  name?: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  created_at: string | null;
  updated_at: string | null;
  status?: string | null;
  tags?: string[] | null;
  [key: string]: unknown;
};

function mapSupabaseRowToContact(row: SupabaseContactRow): Contact {
  const first = row.first_name ?? "";
  const last = row.last_name ?? "";
  const fullName = (row.name ?? "").trim();
  const name =
    [first, last].filter(Boolean).join(" ") ||
    fullName ||
    (row.phone ?? "").trim() ||
    "—";
  const parts = [row.email, row.phone].filter(Boolean) as string[];
  const subtitle = parts.length > 0 ? parts.join(" • ") : undefined;
  return {
    id: row.id,
    first_name: first,
    last_name: last,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    company: row.company ?? undefined,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
    name,
    subtitle,
    status: row.status ?? undefined,
    tags: row.tags ?? undefined,
  };
}

/** Max contacts to fetch in one go (avoid huge responses). */
const MAX_CONTACTS_LIMIT = 50_000;

/**
 * Get total contact count from Supabase for the authenticated owner (no search).
 */
export async function getContactsCountFromSupabase(ownerId: string): Promise<number> {
  const { count, error } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", ownerId);

  if (error) {
    contactsLog("getContactsCountFromSupabase error", error.message, error.code);
    throw error;
  }
  return count ?? 0;
}

/**
 * Fetch contacts from Supabase for the authenticated owner.
 * - Table: public.contacts
 * - Filter: owner_id = ownerId
 * - Order: created_at descending
 * - Limit: max rows to return; use a high value or total count to load all contacts
 * - Optional search: applied in-memory to avoid PostgREST ilike escaping issues
 */
export async function fetchContactsFromSupabase(
  ownerId: string,
  search?: string,
  limit = MAX_CONTACTS_LIMIT
): Promise<Contact[]> {
  contactsLog("fetchContactsFromSupabase", {
    ownerId: ownerId.slice(0, 8) + "...",
    search: search ?? "(none)",
    limit,
  });

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, MAX_CONTACTS_LIMIT));

  if (error) {
    contactsLog("fetchContactsFromSupabase error", error.message, error.code);
    throw error;
  }

  const rows = (data ?? []) as SupabaseContactRow[];
  let contacts = rows.map(mapSupabaseRowToContact);

  const q = search?.trim();
  if (q) {
    const lower = q.toLowerCase();
    contacts = contacts.filter(
      (c) =>
        (c.first_name?.toLowerCase().includes(lower)) ||
        (c.last_name?.toLowerCase().includes(lower)) ||
        (c.name?.toLowerCase().includes(lower)) ||
        (c.phone?.toLowerCase().includes(lower)) ||
        (c.email?.toLowerCase().includes(lower)) ||
        (c.company?.toLowerCase().includes(lower))
    );
  }

  contactsLog("fetchContactsFromSupabase success", { rowCount: contacts.length });
  return contacts;
}
