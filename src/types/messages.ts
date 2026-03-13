export type Conversation = {
  id: string;
  title: string;
  subtitle: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  avatarUri?: string | null;
  contactId?: string | null;
  organization_id?: string | null;
  contact_id?: string | null;
  phone_number_id?: string | null;
  stats?: unknown;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  unread_count?: number | null;
  assigned_to?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  owner_id?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_phone?: string | null;
  contact_avatar_url?: string | null;
  has_outbound?: boolean | null;
  has_inbound_reply?: boolean | null;
  /** Conversation is archived (from API/Supabase if present). */
  archived?: boolean | null;
  /** Conversation is stopped (e.g. opted out; from API/Supabase if present). */
  stopped?: boolean | null;
};

/** Delivery/read status for sent messages: delivered = single gray check, seen = double blue check. */
export type MessageStatus = "sending" | "sent" | "delivered" | "seen";

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  sentAt: string;
  isFromMe: boolean;
  /** Only for isFromMe: delivered (single check) or seen (double blue check). */
  status?: MessageStatus;
};
