import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { setupGracefulShutdown } from './utils/gracefulShutdown.js';
import { buildApp } from './app.js';
import { getRedis } from './storage/RedisClient.js';
import { RabbitMQManager } from './communication/RabbitMQManager.js';

async function main() {
  setupGracefulShutdown();

  // Connect Redis
  const redis = getRedis();
  await redis.connect();
  logger.info('Redis connected');

  // Connect RabbitMQ
  const rmq = RabbitMQManager.getInstance();
  await rmq.connect();
  logger.info('RabbitMQ connected');

  // Build and start Fastify
  const app = await buildApp();

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  logger.info(`Server listening on http://0.0.0.0:${config.PORT}`);
}

main().catch((err) => {
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});
