/**
 * Message templates API: GET list, GET one, POST create, PATCH update, DELETE.
 * Auth: Supabase session (Bearer). Backend filters by organization_id and created_by.
 */

import { api } from "./api";

export type Template = {
  id: string;
  name: string;
  body: string;
  category?: string | null;
  merge_fields?: string[] | null;
  usage_count?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type GetTemplatesResponse = { templates: Template[] };
export type GetTemplateResponse = { template: Template };
export type CreateTemplateBody = { name: string; body: string; category?: string };
export type UpdateTemplateBody = { name?: string; body?: string; category?: string };

/** GET /api/templates?category=... */
export async function getTemplates(category?: string): Promise<Template[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await api.get<GetTemplatesResponse>(`/api/templates${query}`);
  return res.templates ?? [];
}

/** GET /api/templates/[id] – increments usage_count on backend. */
export async function getTemplate(id: string): Promise<Template | null> {
  try {
    const res = await api.get<GetTemplateResponse>(`/api/templates/${id}`);
    return res.template ?? null;
  } catch {
    return null;
  }
}

/** POST /api/templates */
export async function createTemplate(body: CreateTemplateBody): Promise<Template> {
  const res = await api.post<GetTemplateResponse>("/api/templates", body);
  if (!res.template) throw new Error("Create template failed");
  return res.template;
}

/** PATCH /api/templates/[id] */
export async function updateTemplate(id: string, body: UpdateTemplateBody): Promise<Template> {
  const res = await api.patch<GetTemplateResponse>(`/api/templates/${id}`, body);
  if (!res.template) throw new Error("Update template failed");
  return res.template;
}

/** DELETE /api/templates/[id] */
export async function deleteTemplate(id: string): Promise<void> {
  await api.delete<{ success?: boolean }>(`/api/templates/${id}`);
}
