import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Agent } from '../types/api.types';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get<Agent[]>('/agents').then((r) => r.data),
    refetchInterval: 15_000,
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: () => api.get<Agent>(`/agents/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}

export function useRestartAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/agents/${id}/restart`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function usePauseAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/agents/${id}/pause`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useResumeAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/agents/${id}/resume`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}
