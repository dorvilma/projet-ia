import { getRedis } from './RedisClient.js';
import { logger } from '../utils/logger.js';

interface LRUEntry {
  value: string;
  expiry: number;
}

const inMemoryCache = new Map<string, LRUEntry>();
const MAX_IN_MEMORY = 1000;
let redisAvailable = true;

export class CacheService {
  private redis = getRedis();

  constructor() {
    this.redis.on('error', () => {
      if (redisAvailable) {
        redisAvailable = false;
        logger.warn('Redis unavailable, falling back to in-memory cache');
      }
    });
    this.redis.on('connect', () => {
      redisAvailable = true;
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (redisAvailable) {
        const val = await this.redis.get(key);
        return val ? (JSON.parse(val) as T) : null;
      }
    } catch {
      // fallback
    }

    const entry = inMemoryCache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return JSON.parse(entry.value) as T;
    }
    inMemoryCache.delete(key);
    return null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);

    try {
      if (redisAvailable) {
        await this.redis.setex(key, ttlSeconds, serialized);
        return;
      }
    } catch {
      // fallback
    }

    if (inMemoryCache.size >= MAX_IN_MEMORY) {
      const firstKey = inMemoryCache.keys().next().value as string;
      inMemoryCache.delete(firstKey);
    }
    inMemoryCache.set(key, {
      value: serialized,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    try {
      if (redisAvailable) {
        await this.redis.del(key);
      }
    } catch {
      // ignore
    }
    inMemoryCache.delete(key);
  }

  async flush(): Promise<void> {
    inMemoryCache.clear();
    try {
      if (redisAvailable) {
        await this.redis.flushdb();
      }
    } catch {
      // ignore
    }
  }
}

export const cacheService = new CacheService();
