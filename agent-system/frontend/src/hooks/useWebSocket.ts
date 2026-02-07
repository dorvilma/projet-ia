import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type EventHandler = (data: unknown) => void;

export function useWebSocket(url?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(new Map<string, Set<EventHandler>>());
  const queryClient = useQueryClient();

  useEffect(() => {
    const wsUrl = url || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/tasks`;
    const token = localStorage.getItem('token');
    const ws = new WebSocket(`${wsUrl}?token=${token || ''}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type) {
          handlersRef.current.get(msg.type)?.forEach((h) => h(msg.data));

          // Auto-invalidate queries based on event type
          if (msg.type.startsWith('task.')) {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }
          if (msg.type.startsWith('agent.')) {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
          }
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      // Auto-reconnect after 3s
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, [url, queryClient]);

  const subscribe = useCallback((event: string, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);
    return () => handlersRef.current.get(event)?.delete(handler);
  }, []);

  return { subscribe };
}
