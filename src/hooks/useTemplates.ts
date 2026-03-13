import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { queryKeys } from "../lib/queryClient";
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type Template,
  type CreateTemplateBody,
  type UpdateTemplateBody,
} from "../lib/templatesApi";

/** List templates, optional category filter. Returns { templates, isLoading, error, mutate }. */
export function useTemplates(category?: string) {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.templates.list(category),
    queryFn: () => getTemplates(category),
    enabled: isAuthenticated,
  });
  const templates: Template[] = query.data ?? [];
  return {
    templates,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    mutate: query.refetch,
  };
}

/** Single template by id (skipped if id is null). GET increments usage_count. */
export function useTemplate(id: string | null) {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.templates.detail(id ?? ""),
    queryFn: () => getTemplate(id!),
    enabled: isAuthenticated && !!id,
  });
  return {
    template: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Create template. On success invalidates templates list. */
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: CreateTemplateBody) => createTemplate(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
    },
  });
  return {
    createTemplate: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}

/** Update template by id. On success invalidates templates list and detail. */
export function useUpdateTemplate(id: string | null) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ templateId, body }: { templateId: string; body: UpdateTemplateBody }) =>
      updateTemplate(templateId, body),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.detail(templateId) });
    },
  });
  return {
    updateTemplate: (body: UpdateTemplateBody) =>
      id ? mutation.mutateAsync({ templateId: id, body }) : Promise.reject(new Error("No template id")),
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}

/** Delete template by id. On success invalidates templates list. */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (templateId: string) => deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
    },
  });
  return {
    deleteTemplate: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}
