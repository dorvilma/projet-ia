import type { FastifyPluginAsync } from 'fastify';
import { getRedis } from '../../storage/RedisClient.js';
import { RabbitMQManager } from '../../communication/RabbitMQManager.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/ready', async (_, reply) => {
    const checks: Record<string, string> = {};
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      checks.postgres = 'ok';
    } catch { checks.postgres = 'error'; }
    try {
      await getRedis().ping();
      checks.redis = 'ok';
    } catch { checks.redis = 'error'; }
    checks.rabbitmq = RabbitMQManager.getInstance().isConnected() ? 'ok' : 'error';
    const allOk = Object.values(checks).every(v => v === 'ok');
    return reply.status(allOk ? 200 : 503).send({ status: allOk ? 'ready' : 'degraded', checks });
  });
};