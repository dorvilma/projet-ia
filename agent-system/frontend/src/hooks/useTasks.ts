import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Task, PaginatedResponse } from '../types/api.types';

interface TaskFilters {
  projectId?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () =>
      api.get<PaginatedResponse<Task>>('/tasks', { params: filters }).then((r) => r.data),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api.get<Task>(`/tasks/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { projectId: string; title: string; description?: string; priority?: string; type?: string }) =>
      api.post<Task>('/tasks', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useRetryTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/retry`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useCancelTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/cancel`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
