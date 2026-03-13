/**
 * Simple tagged logger for debugging. Filter console by "[Contacts]", "[API]", "[Supabase]".
 * Set DEBUG_CONTACTS=1 or leave as-is to always log.
 */
const DEBUG = true; // set to false to mute

function tag(prefix: string) {
  return (...args: unknown[]) => {
    if (DEBUG) console.log(`[${prefix}]`, ...args);
  };
}

export const contactsLog = tag("Contacts");
export const apiLog = tag("API");
export const supabaseContactsLog = tag("SupabaseContacts");
export const messagesLog = tag("Messages");
export const teamChatLog = tag("TeamChat");
export const editProfileLog = tag("EditProfile");
