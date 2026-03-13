/**
 * Auto-texts from API or Supabase.
 */

import { api } from "./api";
import { supabase } from "./supabase";
import type { AutoText } from "../types/campaigns";

type AutoTextRow = { id: string; title: string; description?: string; active?: boolean; [key: string]: unknown };

function mapRow(r: AutoTextRow): AutoText {
  return { id: r.id, title: r.title ?? "", description: r.description ?? "", active: r.active ?? false };
}

export async function fetchAutoTexts(): Promise<AutoText[]> {
  try {
    const response = await api.get<AutoTextRow[] | { data: AutoTextRow[] }>("/api/auto-texts");
    const rows = Array.isArray(response) ? response : (response as { data: AutoTextRow[] })?.data ?? [];
    return rows.map(mapRow);
  } catch {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return [];
      const { data, error } = await supabase.from("auto_texts").select("*").eq("owner_id", user.id);
      if (error || !data) return [];
      return (data as AutoTextRow[]).map(mapRow);
    } catch {
      return [];
    }
  }
}
