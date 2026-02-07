import { getRedis } from './RedisClient.js';
import { logger } from '../utils/logger.js';

const DEFAULT_LOCK_TTL = 30_000; // 30 seconds

export class LockService {
  private redis = getRedis();

  async acquire(key: string, ttlMs = DEFAULT_LOCK_TTL): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const result = await this.redis.set(lockKey, '1', 'PX', ttlMs, 'NX');
    if (result === 'OK') {
      logger.debug(`Lock acquired: ${key}`);
      return true;
    }
    return false;
  }

  async release(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await this.redis.del(lockKey);
    logger.debug(`Lock released: ${key}`);
  }

  async withLock<T>(key: string, fn: () => Promise<T>, ttlMs = DEFAULT_LOCK_TTL): Promise<T> {
    const acquired = await this.acquire(key, ttlMs);
    if (!acquired) {
      throw new Error(`Could not acquire lock: ${key}`);
    }
    try {
      return await fn();
    } finally {
      await this.release(key);
    }
  }
}

export const lockService = new LockService();
