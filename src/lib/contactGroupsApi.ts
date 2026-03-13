/**
 * Contact groups from API or Supabase (aligned with backend spec).
 *
 * API:
 * - List: GET /api/contact-groups → { groups: [...] } (contact_count, optional auto_blast_badge)
 * - Get one: GET /api/contact-groups/[id]?include_contacts=true → { group, contacts?: [...] }
 *
 * Supabase: public.contact_groups
 * - List: organization_id + created_by, with contact_group_members(count)
 * - Single: by id + organization_id + created_by
 */

import { api } from "./api";
import { supabase } from "./supabase";
import type { ContactGroup } from "../types/campaigns";
import type { Contact } from "../types/contacts";

type ApiGroupRow = {
  id: string;
  name: string;
  contact_count?: number;
  contactCount?: number;
  auto_blast_badge?: boolean | number | string;
  created_by?: string | null;
  owner_id?: string | null;
  user_id?: string | null;
};

type SupabaseGroupRow = {
  id: string;
  name: string;
  contact_count?: number;
  contact_group_members?: Array<{ count: number }> | { count: number };
};

function memberCount(row: SupabaseGroupRow): number {
  const m = row.contact_group_members;
  if (m == null) return 0;
  if (Array.isArray(m) && m.length > 0) return m[0].count ?? 0;
  if (typeof m === "object" && "count" in m) return (m as { count: number }).count ?? 0;
  return 0;
}

function mapRowToGroup(row: ApiGroupRow | SupabaseGroupRow): ContactGroup {
  const apiRow = row as ApiGroupRow;
  const sbRow = row as SupabaseGroupRow;
  const count =
    apiRow.contact_count ?? apiRow.contactCount ?? memberCount(sbRow) ?? sbRow.contact_count ?? 0;
  return {
    id: row.id,
    name: row.name ?? "",
    contactCount: count,
    autoBlastBadge: apiRow.auto_blast_badge,
  };
}

function getOrgId(user: { id: string; user_metadata?: unknown; app_metadata?: unknown }): string {
  return (
    (user as { organization_id?: string }).organization_id ??
    (user?.user_metadata as { organization_id?: string } | undefined)?.organization_id ??
    (user?.app_metadata as { organization_id?: string } | undefined)?.organization_id ??
    ""
  );
}

/** Return true if this group belongs to the given user (created_by, owner_id, or user_id). */
function groupBelongsToUser(row: ApiGroupRow, userId: string): boolean {
  return (
    row.created_by === userId ||
    row.owner_id === userId ||
    row.user_id === userId
  );
}

/** List contact groups (only the current logged-in user's groups). */
export async function fetchContactGroups(): Promise<ContactGroup[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  try {
    const response = await api.get<{ groups: ApiGroupRow[] } | { data: ApiGroupRow[] }>("/api/contact-groups");
    let rows: ApiGroupRow[] = [];
    if (response && typeof response === "object" && "groups" in response && Array.isArray((response as { groups: ApiGroupRow[] }).groups)) {
      rows = (response as { groups: ApiGroupRow[] }).groups;
    } else if (response && typeof response === "object" && "data" in response && Array.isArray((response as { data: ApiGroupRow[] }).data)) {
      rows = (response as { data: ApiGroupRow[] }).data;
    } else if (Array.isArray(response)) {
      rows = response as ApiGroupRow[];
    }
    // Only show groups that belong to the logged-in user
    if (userId) {
      rows = rows.filter((row) => groupBelongsToUser(row, userId));
    }
    return rows.map(mapRowToGroup);
  } catch {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return [];
      const orgId = getOrgId(user);
      const { data, error } = await supabase
        .from("contact_groups")
        .select("*, contact_group_members(count)")
        .eq("organization_id", orgId)
        .eq("created_by", user.id)
        .order("name");
      if (error || !data) return [];
      return (data as SupabaseGroupRow[]).map(mapRowToGroup);
    } catch {
      return [];
    }
  }
}

export type ContactGroupDetailResponse = {
  group: ContactGroup;
  contacts?: Contact[];
};

/** Create a new contact group (API or Supabase). */
export async function createContactGroup(name: string, description?: string): Promise<ContactGroup> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Group name is required");

  const payload = { name: trimmed, description: description?.trim() || null };

  try {
    const response = await api.post<{ group: ApiGroupRow } | ApiGroupRow>("/api/contact-groups", payload);
    const raw = response && typeof response === "object" && "group" in response
      ? (response as { group: ApiGroupRow }).group
      : (response as ApiGroupRow);
    if (!raw?.id) throw new Error("Invalid API response");
    return mapRowToGroup(raw);
  } catch {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Not authenticated");
    const orgId = getOrgId(user);
    const now = new Date().toISOString();
    const insertRow: Record<string, unknown> = {
      name: trimmed,
      organization_id: orgId || null,
      created_by: user.id,
      created_at: now,
      updated_at: now,
    };
    if (payload.description != null) insertRow.description = payload.description;
    const { data, error } = await supabase
      .from("contact_groups")
      .insert(insertRow)
      .select("id, name")
      .single();
    if (error || !data) throw error ?? new Error("Failed to create group");
    return mapRowToGroup(data as SupabaseGroupRow);
  }
}

/** Get one group by id; optionally include up to 100 contacts (API: include_contacts=true). */
export async function fetchContactGroupById(
  id: string,
  includeContacts = false
): Promise<ContactGroupDetailResponse | null> {
  try {
    const url = includeContacts ? `/api/contact-groups/${id}?include_contacts=true` : `/api/contact-groups/${id}`;
    const response = await api.get<{ group: ApiGroupRow; contacts?: unknown[] }>(url);
    const raw = response?.group;
    if (!raw) return null;
    const group = mapRowToGroup(raw);
    const contacts = Array.isArray(response?.contacts)
      ? (response.contacts as { id: string; first_name?: string; last_name?: string; name?: string; phone?: string; email?: string }[]).map(
          (c) =>
            ({
              id: c.id,
              first_name: c.first_name ?? "",
              last_name: c.last_name ?? "",
              name: [c.first_name, c.last_name].filter(Boolean).join(" ") || (c.name ?? "") || (c.phone ?? "") || "—",
              phone: c.phone,
              email: c.email,
              subtitle: [c.email, c.phone].filter(Boolean).join(" • "),
            }) as Contact
        )
      : undefined;
    return { group, contacts };
  } catch {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return null;
      const orgId = getOrgId(user);
      const { data: groupData, error: groupError } = await supabase
        .from("contact_groups")
        .select("*, contact_group_members(count)")
        .eq("id", id)
        .eq("organization_id", orgId)
        .eq("created_by", user.id)
        .single();
      if (groupError || !groupData) return null;
      const group = mapRowToGroup(groupData as SupabaseGroupRow);
      let contacts: Contact[] | undefined;
      if (includeContacts) {
        const { data: members } = await supabase
          .from("contact_group_members")
          .select("contact_id")
          .eq("contact_group_id", id)
          .limit(100);
        const contactIds = (members ?? []).map((m) => (m as { contact_id: string }).contact_id).filter(Boolean);
        if (contactIds.length > 0) {
          const { data: contactRows } = await supabase.from("contacts").select("id, first_name, last_name, phone, email").in("id", contactIds);
          contacts = (contactRows ?? []).map((r: { id: string; first_name?: string; last_name?: string; phone?: string; email?: string }) => ({
            id: r.id,
            first_name: r.first_name ?? "",
            last_name: r.last_name ?? "",
            name: [r.first_name, r.last_name].filter(Boolean).join(" ") || (r.phone ?? "") || "—",
            phone: r.phone,
            email: r.email,
            subtitle: [r.email, r.phone].filter(Boolean).join(" • "),
          })) as Contact[];
        }
      }
      return { group, contacts };
    } catch {
      return null;
    }
  }
}
