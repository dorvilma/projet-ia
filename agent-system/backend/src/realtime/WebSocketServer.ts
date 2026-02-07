import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { logger } from '../utils/logger.js';
import type { WsMessage, WsEventType } from './EventTypes.js';

interface WsClient {
  socket: WebSocket;
  userId?: string;
  rooms: Set<string>;
}

export class WebSocketServer {
  private static instance: WebSocketServer;
  private clients = new Map<string, WsClient>();
  private rooms = new Map<string, Set<string>>();
  private idCounter = 0;

  private constructor() {}

  static getInstance(): WebSocketServer {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer();
    }
    return WebSocketServer.instance;
  }

  addClient(socket: WebSocket, userId?: string): string {
    const clientId = `ws-${++this.idCounter}`;
    const client: WsClient = { socket, userId, rooms: new Set() };
    this.clients.set(clientId, client);

    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleClientMessage(clientId, msg);
      } catch {
        // ignore invalid messages
      }
    });

    socket.on('close', () => {
      this.removeClient(clientId);
    });

    logger.debug(`WebSocket client connected: ${clientId}`, { userId });
    return clientId;
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      for (const room of client.rooms) {
        this.rooms.get(room)?.delete(clientId);
      }
      this.clients.delete(clientId);
      logger.debug(`WebSocket client disconnected: ${clientId}`);
    }
  }

  private handleClientMessage(clientId: string, msg: { type: string; room?: string }): void {
    if (msg.type === 'subscribe' && msg.room) {
      this.joinRoom(clientId, msg.room);
    } else if (msg.type === 'unsubscribe' && msg.room) {
      this.leaveRoom(clientId, msg.room);
    }
  }

  joinRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.add(room);
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(clientId);
  }

  leaveRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.delete(room);
    this.rooms.get(room)?.delete(clientId);
  }

  broadcast(event: WsEventType, data: unknown, correlationId?: string): void {
    const message: WsMessage = {
      type: event,
      data,
      timestamp: new Date().toISOString(),
      correlationId,
    };
    const payload = JSON.stringify(message);

    for (const client of this.clients.values()) {
      if (client.socket.readyState === 1) {
        client.socket.send(payload);
      }
    }
  }

  broadcastToRoom(room: string, event: WsEventType, data: unknown, correlationId?: string): void {
    const clientIds = this.rooms.get(room);
    if (!clientIds) return;

    const message: WsMessage = {
      type: event,
      data,
      timestamp: new Date().toISOString(),
      correlationId,
    };
    const payload = JSON.stringify(message);

    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client?.socket.readyState === 1) {
        client.socket.send(payload);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getRoomCount(room: string): number {
    return this.rooms.get(room)?.size || 0;
  }

  getStats(): { clients: number; rooms: number; roomDetails: Record<string, number> } {
    const roomDetails: Record<string, number> = {};
    for (const [room, clients] of this.rooms) {
      roomDetails[room] = clients.size;
    }
    return {
      clients: this.clients.size,
      rooms: this.rooms.size,
      roomDetails,
    };
  }
}
