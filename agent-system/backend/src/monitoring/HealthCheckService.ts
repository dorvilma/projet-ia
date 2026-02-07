import { getPrisma } from '../storage/PrismaClient.js';
import { getRedis } from '../storage/RedisClient.js';
import { RabbitMQManager } from '../communication/RabbitMQManager.js';
import { PluginRegistry } from '../plugins/PluginRegistry.js';
import { logger } from '../utils/logger.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: string; latencyMs?: number; error?: string }>;
  timestamp: string;
}

export class HealthCheckService {
  async check(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {};

    // PostgreSQL
    const pgStart = Date.now();
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      checks.postgres = { status: 'ok', latencyMs: Date.now() - pgStart };
    } catch (err) {
      checks.postgres = { status: 'error', error: (err as Error).message };
    }

    // Redis
    const redisStart = Date.now();
    try {
      await getRedis().ping();
      checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
    } catch (err) {
      checks.redis = { status: 'error', error: (err as Error).message };
    }

    // RabbitMQ
    checks.rabbitmq = {
      status: RabbitMQManager.getInstance().isConnected() ? 'ok' : 'error',
    };

    // Integrations
    const pluginHealth = await PluginRegistry.getInstance().healthCheckAll();
    for (const [id, healthy] of Object.entries(pluginHealth)) {
      checks[`integration:${id}`] = { status: healthy ? 'ok' : 'error' };
    }

    // Determine overall status
    const values = Object.values(checks);
    const coreChecks = [checks.postgres, checks.redis, checks.rabbitmq];
    const coreHealthy = coreChecks.every((c) => c?.status === 'ok');
    const allHealthy = values.every((c) => c.status === 'ok');

    let status: HealthStatus['status'];
    if (!coreHealthy) {
      status = 'unhealthy';
    } else if (!allHealthy) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return { status, checks, timestamp: new Date().toISOString() };
  }
}

export const healthCheckService = new HealthCheckService();
