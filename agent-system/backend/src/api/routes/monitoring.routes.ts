import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getPrisma } from '../../storage/PrismaClient.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { healthCheckService } from '../../monitoring/HealthCheckService.js';
import { metricsCollector } from '../../monitoring/MetricsCollector.js';
import { paginationSchema, buildPaginatedResult, buildPrismaArgs } from '../../utils/pagination.js';
import type { Prisma } from '@prisma/client';

export const monitoringRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);
  const prisma = getPrisma();

  app.get('/health', async (_request, reply) => {
    const result = await healthCheckService.check();
    const status = Object.values(result.checks).every((v: any) => v.status === 'ok') ? 200 : 503;
    return reply.status(status).send(result);
  });

  app.get('/metrics', async (_request, reply) => {
    const metrics = await metricsCollector.collectSystemMetrics();
    return reply.send(metrics);
  });

  app.get('/alerts', async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const filterSchema = z.object({
      status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED']).optional(),
      severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
    });
    const filters = filterSchema.parse(request.query);

    const where: Prisma.AlertWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;

    const [data, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        ...buildPrismaArgs(params),
        orderBy: { triggeredAt: 'desc' },
      }),
      prisma.alert.count({ where }),
    ]);
    return reply.send(buildPaginatedResult(data, total, params));
  });

  app.patch('/alerts/:id/acknowledge', async (request, reply) => {
    const { id } = z.object({ id: z.string().cuid() }).parse(request.params);
    const alert = await prisma.alert.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED' },
    });
    return reply.send(alert);
  });

  app.patch('/alerts/:id/resolve', async (request, reply) => {
    const { id } = z.object({ id: z.string().cuid() }).parse(request.params);
    const alert = await prisma.alert.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    return reply.send(alert);
  });
};
