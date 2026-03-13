/** Contact shape aligned with public.contacts (Supabase schema). */
export type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  company?: string;
  created_at?: string;
  updated_at?: string;
  /** Computed for list display: "First Last" */
  name: string;
  /** Computed for list subtitle: email • phone */
  subtitle?: string;
  /** From Supabase: status, tags */
  status?: string;
  tags?: string[];
};

export type ContactRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  created_at: string;
  updated_at: string;
  sync_status: string;
  synced_at: string | null;
};

function toDisplayContact(row: ContactRow): Contact {
  const first = row.first_name ?? "";
  const last = row.last_name ?? "";
  const name =
    [first, last].filter(Boolean).join(" ") ||
    (row.phone ?? "").trim() ||
    "—";
  const parts = [row.email, row.phone].filter(Boolean) as string[];
  const subtitle = parts.length > 0 ? parts.join(" • ") : undefined;
  return {
    id: row.id,
    first_name: row.first_name ?? "",
    last_name: row.last_name ?? "",
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    company: row.company ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    name,
    subtitle,
  };
}

export { toDisplayContact };
