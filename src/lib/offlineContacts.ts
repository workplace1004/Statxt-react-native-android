import * as SQLite from "expo-sqlite";
import type { Contact } from "../types/contacts";
import { toDisplayContact } from "../types/contacts";

export type ContactRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  created_at: string;
  updated_at: string;
  sync_status: string;
  synced_at: string | null;
  supabase_id: string | null;
};

const DB_NAME = "statxt_contacts.db";
const SYNC_STATUS_PENDING = "pending";
const SYNC_STATUS_SYNCED = "synced";

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (!initPromise) {
    initPromise = (async () => {
      db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          company TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT '${SYNC_STATUS_PENDING}',
          synced_at TEXT,
          supabase_id TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_contacts_user_sync ON contacts(user_id, sync_status);
        CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at DESC);
      `);
    })();
  }
  await initPromise;
  return db!;
}

export type CreateContactInput = {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  company?: string;
};

/**
 * 1. Write to SQLite immediately (sync_status = 'pending')
 * Returns the local contact so UI can show it; sync is enqueued (pending rows).
 */
export async function insertContactLocal(
  userId: string,
  input: CreateContactInput
): Promise<Contact> {
  const database = await getDb();
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO contacts (id, user_id, first_name, last_name, phone, email, company, created_at, updated_at, sync_status, synced_at, supabase_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      (input.first_name ?? "").trim(),
      (input.last_name ?? "").trim(),
      input.phone?.trim() || null,
      input.email?.trim() || null,
      input.company?.trim() || null,
      now,
      now,
      SYNC_STATUS_PENDING,
      null,
      null,
    ]
  );

  const row = await database.getFirstAsync<ContactRow>(
    "SELECT * FROM contacts WHERE id = ?",
    [id]
  );
  if (!row) throw new Error("Insert failed");
  return toDisplayContact(row);
}

/**
 * Read contacts from SQLite (optionally filter by search).
 */
export async function getContactsLocal(
  userId: string,
  search: string
): Promise<Contact[]> {
  const database = await getDb();
  let rows: ContactRow[];

  if (search.trim()) {
    const q = `%${search.trim()}%`;
    rows = await database.getAllAsync<ContactRow>(
      `SELECT * FROM contacts WHERE user_id = ? AND (
        first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?
      ) ORDER BY created_at DESC`,
      [userId, q, q, q, q, q]
    );
  } else {
    rows = await database.getAllAsync<ContactRow>(
      "SELECT * FROM contacts WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
  }

  return rows.map(toDisplayContact);
}

/**
 * Get pending contacts for sync (enqueue = rows with sync_status = 'pending').
 */
export async function getPendingContacts(userId: string): Promise<ContactRow[]> {
  const database = await getDb();
  return database.getAllAsync<ContactRow>(
    "SELECT * FROM contacts WHERE user_id = ? AND sync_status = ? ORDER BY created_at ASC",
    [userId, SYNC_STATUS_PENDING]
  );
}

/**
 * Mark contact as synced after successful Supabase upsert (optionally store supabase_id).
 */
export async function markContactSynced(
  localId: string,
  supabaseId?: string
): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();
  if (supabaseId) {
    await database.runAsync(
      "UPDATE contacts SET sync_status = ?, synced_at = ?, updated_at = ?, supabase_id = ? WHERE id = ?",
      [SYNC_STATUS_SYNCED, now, now, supabaseId, localId]
    );
  } else {
    await database.runAsync(
      "UPDATE contacts SET sync_status = ?, synced_at = ?, updated_at = ? WHERE id = ?",
      [SYNC_STATUS_SYNCED, now, now, localId]
    );
  }
}
