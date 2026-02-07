import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Project, PaginatedResponse } from '../types/api.types';

export function useProjects(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['projects', page, limit],
    queryFn: () =>
      api.get<PaginatedResponse<Project>>('/projects', { params: { page, limit } }).then((r) => r.data),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => api.get<Project>(`/projects/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; consumptionMode?: string }) =>
      api.post<Project>('/projects', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; status?: string }) =>
      api.patch<Project>(`/projects/${id}`, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
