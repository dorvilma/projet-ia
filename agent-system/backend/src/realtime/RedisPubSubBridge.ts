import { getRedisSubscriber, getRedis } from '../storage/RedisClient.js';
import { WebSocketServer } from './WebSocketServer.js';
import { logger } from '../utils/logger.js';
import { registerShutdownHandler } from '../utils/gracefulShutdown.js';
import type { WsEventType } from './EventTypes.js';

const CHANNEL_PREFIX = 'agent-system:events:';

export class RedisPubSubBridge {
  private static instance: RedisPubSubBridge;
  private subscriber = getRedisSubscriber();
  private publisher = getRedis();
  private running = false;

  private constructor() {}

  static getInstance(): RedisPubSubBridge {
    if (!RedisPubSubBridge.instance) {
      RedisPubSubBridge.instance = new RedisPubSubBridge();
    }
    return RedisPubSubBridge.instance;
  }

  async start(): Promise<void> {
    if (this.running) return;

    await this.subscriber.connect();

    // Subscribe to all event channels
    await this.subscriber.psubscribe(`${CHANNEL_PREFIX}*`);

    this.subscriber.on('pmessage', (_pattern, channel, message) => {
      const eventType = channel.replace(CHANNEL_PREFIX, '') as WsEventType;
      try {
        const data = JSON.parse(message);
        const wsServer = WebSocketServer.getInstance();

        if (data.room) {
          wsServer.broadcastToRoom(data.room, eventType, data.payload, data.correlationId);
        } else {
          wsServer.broadcast(eventType, data.payload, data.correlationId);
        }
      } catch (err) {
        logger.error('Error processing pub/sub message', {
          channel,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    this.running = true;
    logger.info('Redis PubSub bridge started');

    registerShutdownHandler(async () => {
      await this.stop();
    });
  }

  async publish(
    event: WsEventType,
    payload: unknown,
    options?: { room?: string; correlationId?: string },
  ): Promise<void> {
    const channel = `${CHANNEL_PREFIX}${event}`;
    const message = JSON.stringify({
      payload,
      room: options?.room,
      correlationId: options?.correlationId,
    });
    await this.publisher.publish(channel, message);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    await this.subscriber.punsubscribe(`${CHANNEL_PREFIX}*`);
    this.running = false;
    logger.info('Redis PubSub bridge stopped');
  }
}
