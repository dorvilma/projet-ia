import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { registerShutdownHandler } from '../utils/gracefulShutdown.js';

let redis: Redis;
let subscriber: Redis;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      lazyConnect: true,
    });

    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
    redis.on('close', () => logger.warn('Redis connection closed'));

    registerShutdownHandler(async () => {
      logger.info('Disconnecting Redis...');
      await redis.quit();
    });
  }
  return redis;
}

export function getRedisSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 200, 5000);
      },
      lazyConnect: true,
    });

    subscriber.on('error', (err) =>
      logger.error('Redis subscriber error', { error: err.message }),
    );

    registerShutdownHandler(async () => {
      logger.info('Disconnecting Redis subscriber...');
      await subscriber.quit();
    });
  }
  return subscriber;
}
