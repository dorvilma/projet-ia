import amqplib, { type Connection, type Channel, type ConsumeMessage } from 'amqplib';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { registerShutdownHandler } from '../utils/gracefulShutdown.js';
import { withRetry } from '../utils/retry.js';
import { exchanges, buildQueues } from '../config/rabbitmq-topology.js';

export class RabbitMQManager {
  private static instance: RabbitMQManager;
  private connection: any = null;
  private channel: Channel | null = null;
  private reconnecting = false;

  private constructor() {}

  static getInstance(): RabbitMQManager {
    if (!RabbitMQManager.instance) {
      RabbitMQManager.instance = new RabbitMQManager();
    }
    return RabbitMQManager.instance;
  }

  async connect(): Promise<void> {
    await withRetry(
      async () => {
        this.connection = await amqplib.connect(config.RABBITMQ_URL);
        this.channel = await this.connection.createChannel();
        await this.channel!.prefetch(1);

        this.connection.on('close', () => {
          logger.warn('RabbitMQ connection closed');
          this.handleReconnect();
        });

        this.connection.on('error', (err: Error) => {
          logger.error('RabbitMQ connection error', { error: err.message });
        });

        await this.setupTopology();
        logger.info('RabbitMQ topology configured');
      },
      'RabbitMQ connect',
      { maxAttempts: 5, baseDelayMs: 2000 },
    );

    registerShutdownHandler(async () => {
      logger.info('Closing RabbitMQ...');
      await this.close();
    });
  }

  private async setupTopology(): Promise<void> {
    if (!this.channel) throw new Error('Channel not available');

    for (const ex of exchanges) {
      await this.channel.assertExchange(ex.name, ex.type, ex.options);
    }

    const queues = buildQueues();
    for (const q of queues) {
      const options: Record<string, unknown> = { durable: q.options.durable };
      if (q.options.deadLetterExchange) {
        options.deadLetterExchange = q.options.deadLetterExchange;
      }
      if (q.options.deadLetterRoutingKey) {
        options.deadLetterRoutingKey = q.options.deadLetterRoutingKey;
      }
      if (q.options.messageTtl) {
        options.messageTtl = q.options.messageTtl;
      }
      await this.channel.assertQueue(q.name, options);

      for (const binding of q.bindings) {
        await this.channel.bindQueue(q.name, binding.exchange, binding.routingKey);
      }
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnecting) return;
    this.reconnecting = true;
    logger.info('Attempting RabbitMQ reconnection...');
    try {
      await this.connect();
      this.reconnecting = false;
    } catch (err) {
      this.reconnecting = false;
      logger.error('RabbitMQ reconnection failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  getChannel(): Channel {
    if (!this.channel) throw new Error('RabbitMQ channel not available');
    return this.channel;
  }

  async publish(exchange: string, routingKey: string, message: unknown, headers?: Record<string, string>): Promise<boolean> {
    if (!this.channel) {
      logger.error('Cannot publish: RabbitMQ channel not available');
      return false;
    }
    const content = Buffer.from(JSON.stringify(message));
    return this.channel.publish(exchange, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
      headers,
    });
  }

  async consume(
    queue: string,
    handler: (msg: ConsumeMessage) => Promise<void>,
  ): Promise<string> {
    if (!this.channel) throw new Error('RabbitMQ channel not available');

    const { consumerTag } = await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        await handler(msg);
        this.channel?.ack(msg);
      } catch (err) {
        logger.error(`Error processing message from ${queue}`, {
          error: err instanceof Error ? err.message : String(err),
        });
        // Reject and requeue (will go to DLX after max retries)
        this.channel?.nack(msg, false, false);
      }
    }, { noAck: false });

    return consumerTag;
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // Ignore close errors during shutdown
    }
    this.channel = null;
    this.connection = null;
  }

  isConnected(): boolean {
    return this.channel !== null && this.connection !== null;
  }
}
