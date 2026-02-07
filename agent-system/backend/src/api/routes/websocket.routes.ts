import type { FastifyPluginAsync } from 'fastify';
import { WebSocketServer } from '../../realtime/WebSocketServer.js';

export const websocketRoutes: FastifyPluginAsync = async (app) => {
  app.get('/tasks', { websocket: true }, (socket, request) => {
    const wsServer = WebSocketServer.getInstance();
    const token = (request.query as any)?.token;

    let userId: string | undefined;
    if (token) {
      try {
        const decoded = app.jwt.verify<{ sub: string }>(token);
        userId = decoded.sub;
      } catch {
        // Allow unauthenticated WS connections with limited access
      }
    }

    const clientId = wsServer.addClient(socket, userId);

    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && msg.room) {
          wsServer.joinRoom(clientId, msg.room);
        }
        if (msg.type === 'unsubscribe' && msg.room) {
          wsServer.leaveRoom(clientId, msg.room);
        }
      } catch {
        // ignore malformed messages
      }
    });

    socket.on('close', () => {
      wsServer.removeClient(clientId);
    });
  });

  app.get('/stats', async (_request, reply) => {
    const stats = WebSocketServer.getInstance().getStats();
    return reply.send(stats);
  });
};
