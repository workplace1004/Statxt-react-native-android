/** Contact group (audience) for campaigns and auto-texts. */
export type ContactGroup = {
  id: string;
  name: string;
  contactCount: number;
  /** Optional badge for auto-blast (from API/Supabase). */
  autoBlastBadge?: boolean | number | string;
};

/** Campaign status (matches API: draft|scheduled|sending|completed|paused|...) */
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "running"
  | "completed"
  | "paused";

/** Phone number relation from API/Supabase. */
export type CampaignPhoneNumber = {
  phone: string;
  friendly_name?: string;
};

/** Creator user relation from API/Supabase. */
export type CampaignCreator = {
  full_name?: string;
  email?: string;
};

/** Recipient row for single campaign (campaign_recipients). */
export type CampaignRecipient = {
  id: string;
  phone: string;
  status?: string;
  processed_at?: string;
  error_message?: string | null;
  skip_reason?: string | null;
};

/** Campaign for list and detail views. */
export type Campaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  sentAt?: string;
  recipientCount: number;
  sentCount?: number;
  deliveredPercent?: number;
  responsePercent?: number;
  completedAt?: string;
  deliveredCount?: number;
  failedCount?: number;
  pendingCount?: number;
  repliesCount?: number;
  optOutCount?: number;
  optOutRate?: number;
  messageText?: string;
  createdAt?: string;
  startedAt?: string;
  /** From API/Supabase relations (list + single). */
  phone_numbers?: CampaignPhoneNumber[];
  /** From API/Supabase users!created_by (list + single). */
  creator?: CampaignCreator;
  /** From API/Supabase single campaign only. */
  campaign_recipients?: CampaignRecipient[];
};

/** Auto-text (automated message template). */
export type AutoText = {
  id: string;
  title: string;
  description: string;
  active: boolean;
};

/** Status for auto_blast (API excludes 'canceled' from list). */
export type AutoBlastStatus = "draft" | "active" | "paused" | "canceled";

/** Message variant for an auto_blast. */
export type AutoBlastVariant = {
  id: string;
  auto_blast_id: string;
  message_text?: string;
  message_body?: string;
  position?: number;
  [key: string]: unknown;
};

/** Stats enriched on list/single (from campaigns + auto_blast_stops). */
export type AutoBlastStats = {
  total_runs?: number;
  total_sent?: number;
  total_replies?: number;
  total_opt_outs?: number;
  total_stops?: number;
};

/** Auto-blast (scheduled/recurring blasts) with variants and optional stats. */
export type AutoBlast = {
  id: string;
  organization_id?: string;
  created_by?: string;
  title?: string;
  name?: string;
  description?: string;
  status: AutoBlastStatus;
  next_run_at?: string | null;
  schedule?: string | null;
  contact_group_id?: string | null;
  created_at?: string;
  updated_at?: string;
  auto_blast_variants?: AutoBlastVariant[];
  stats?: AutoBlastStats;
  [key: string]: unknown;
};

/** Single run of an auto_blast (from auto_blast_runs). */
export type AutoBlastRun = {
  id: string;
  auto_blast_id: string;
  run_at: string;
  status?: string;
  campaign_id?: string | null;
  campaign_ids?: string[] | null;
  campaigns_completed?: number;
  campaigns_total?: number;
  queue_position?: number | null;
  estimated_recipients?: number | null;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

/** Team chat thread (for Team tab). */
export type TeamThread = {
  id: string;
  title: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  /** direct | group | channel — used for All / Direct / Groups / Channels tabs */
  type?: "direct" | "group" | "channel";
};
