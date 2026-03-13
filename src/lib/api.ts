import { config } from "../config";
import { supabase } from "./supabase";
import { apiLog } from "./logger";

const baseUrl = config.apiUrl.replace(/\/$/, "");

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

/** API client that sends Supabase session as Bearer token (sample-app style). */
class ApiClient {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const hasToken = !!session?.access_token;
    apiLog("getAuthHeaders", { hasToken, userId: session?.user?.id ?? null });
    if (!hasToken) return {};
    return { Authorization: `Bearer ${session!.access_token}` };
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, timeout = 15000 } = options;
    const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    apiLog("request", { method, url });
    const authHeaders = await this.getAuthHeaders();
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...authHeaders,
      ...headers,
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      apiLog("response", { url, status: response.status, ok: response.ok });
      if (response.status === 401) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          apiLog("401, refreshed session, retrying");
          return this.request<T>(endpoint, options);
        }
        apiLog("401, refresh failed", refreshError?.message);
        throw new Error("Session expired. Please sign in again.");
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = (data as { error?: string })?.error ?? `Request failed with status ${response.status}`;
        apiLog("response not ok", { status: response.status, error: msg });
        throw new Error(msg);
      }
      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);
      apiLog("request error", err instanceof Error ? err.message : err);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Request timed out");
      }
      throw err;
    }
  }

  get<T>(endpoint: string, options?: Omit<ApiOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }
  post<T>(endpoint: string, body?: unknown, options?: Omit<ApiOptions, "method">) {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }
  patch<T>(endpoint: string, body?: unknown, options?: Omit<ApiOptions, "method">) {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  }
  delete<T>(endpoint: string, options?: Omit<ApiOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /** POST FormData (e.g. file upload). Do not set Content-Type so multipart boundary is set automatically. */
  async postFormData<T>(endpoint: string, formData: FormData, options: { timeout?: number } = {}): Promise<T> {
    const { timeout = 30000 } = options;
    const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const authHeaders = await this.getAuthHeaders();
    const requestHeaders: Record<string, string> = { ...authHeaders };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: requestHeaders,
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.status === 401) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) return this.postFormData<T>(endpoint, formData, options);
        throw new Error("Session expired. Please sign in again.");
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = (data as { error?: string })?.error ?? `Upload failed with status ${response.status}`;
        apiLog("postFormData not ok", { endpoint, status: response.status, data });
        if (response.status >= 500) {
          apiLog("postFormData server error – check backend /api/storage/upload (bucket, permissions, size limits)", { endpoint });
        }
        throw new Error(msg);
      }
      apiLog("postFormData ok", { url, data });
      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") throw new Error("Upload timed out");
      throw err;
    }
  }
}

export const api = new ApiClient();

/** Response from POST /api/storage/upload */
export type StorageUploadResponse = { url: string; path: string; bucket: string };

/** Upload a file via backend; returns public URL. */
export async function uploadStorageFile(formData: FormData): Promise<StorageUploadResponse> {
  return api.postFormData<StorageUploadResponse>("/api/storage/upload", formData);
}

/**
 * Delete a file from Supabase Storage. Calls POST /api/storage/delete.
 * Body: { bucket: string, path: string }. Path is the object path within the bucket
 * (e.g. "f108eee6-....jpg" or "avatars/userId/file.jpg"). Backend must use service
 * role (or admin) to remove the object so storage is actually updated.
 */
export async function deleteStorageFile(bucket: string, path: string): Promise<void> {
  await api.request("/api/storage/delete", { method: "POST", body: { bucket, path } });
}

/** Profile fields updatable via PATCH /api/users/profile */
export type UserProfilePatch = {
  avatar_url?: string | null;
  full_name?: string | null;
  fullName?: string | null;
};

const PROFILE_PATCH_TIMEOUT_MS = 30000;

export async function updateUserProfile(patch: UserProfilePatch): Promise<void> {
  await api.request("/api/users/profile", {
    method: "PATCH",
    body: patch,
    timeout: PROFILE_PATCH_TIMEOUT_MS,
  });
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...rest, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return undefined as T;
}

export type TwoFaToggleResponse = { enabled: boolean };

export async function get2faToggle(token: string): Promise<TwoFaToggleResponse> {
  return apiFetch<TwoFaToggleResponse>("/api/auth/2fa/toggle", { method: "GET", token });
}

export async function send2faOtp(token: string): Promise<void> {
  await apiFetch("/api/auth/2fa/send", { method: "POST", token });
}

export async function verify2faOtp(token: string, code: string): Promise<void> {
  await apiFetch("/api/auth/2fa/verify", {
    method: "POST",
    token,
    body: JSON.stringify({ code }),
  });
}

/** Team members (org users) from GET /api/team/members */
export type TeamMember = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

export function getTeamMembers(): Promise<TeamMember[]> {
  return api.get<TeamMember[]>("/api/team/members");
}

export function updateTeamMemberRole(id: string, role: string): Promise<TeamMember> {
  return api.patch<TeamMember>(`/api/team/members/${id}`, { role });
}

export function removeTeamMember(id: string): Promise<void> {
  return api.delete(`/api/team/members/${id}`);
}
