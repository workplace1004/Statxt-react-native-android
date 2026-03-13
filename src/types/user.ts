/** Minimal user type for auth (no @statxt/shared dependency). */
export interface User {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string | null;
  organization_id?: string;
  /** Current user's role in the organization (e.g. Owner, Admin, Manager, Member). */
  role?: string | null;
}
