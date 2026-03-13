import { supabase } from "./supabase";
import {
  getPendingContacts,
  markContactSynced,
  type ContactRow,
} from "./offlineContacts";
import { contactsLog } from "./logger";

/**
 * Sync pending SQLite rows to Supabase (public.contacts).
 * Table uses owner_id (not user_id). Inserts/updates match your schema.
 * Throws if any sync fails so the caller can show an error (e.g. Add contact screen).
 */
export async function syncPendingContactsToSupabase(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    contactsLog("syncPendingContactsToSupabase", "no user, skip");
    return;
  }

  const pending = await getPendingContacts(user.id);
  contactsLog("syncPendingContactsToSupabase", { pendingCount: pending.length });

  for (const row of pending) {
    try {
      if (row.supabase_id) {
        const { error } = await supabase
          .from("contacts")
          .update({
            first_name: row.first_name,
            last_name: row.last_name,
            phone: row.phone || null,
            email: row.email || null,
            company: row.company || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.supabase_id)
          .eq("owner_id", user.id);

        if (error) throw error;
        await markContactSynced(row.id);
        contactsLog("syncPendingContactsToSupabase", "updated", row.id);
      } else {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("contacts")
          .insert({
            owner_id: user.id,
            first_name: row.first_name,
            last_name: row.last_name,
            phone: row.phone || null,
            email: row.email || null,
            company: row.company || null,
            created_at: now,
            updated_at: now,
          })
          .select("id")
          .single();

        if (error) {
          contactsLog("syncPendingContactsToSupabase insert error", error.message, error.code, error.details);
          throw error;
        }
        await markContactSynced(row.id, data?.id ?? undefined);
        contactsLog("syncPendingContactsToSupabase", "inserted", row.id, "supabase_id", data?.id);
      }
    } catch (e) {
      contactsLog("syncPendingContactsToSupabase failed for", row.id, e instanceof Error ? e.message : e);
      throw e;
    }
  }
}
