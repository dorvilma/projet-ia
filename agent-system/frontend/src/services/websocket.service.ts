type EventHandler = (data: unknown) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    const token = localStorage.getItem('token');
    const wsUrl = `${this.url}?token=${token || ''}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit('connected', null);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type) {
          this.emit(msg.type, msg.data);
        }
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.emit('disconnected', null);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: unknown) {
    this.handlers.get(event)?.forEach((handler) => handler(data));
  }

  send(type: string, data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;
export const wsService = new WebSocketService(`${WS_URL}/tasks`);
