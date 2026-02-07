import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getPrisma } from '../../storage/PrismaClient.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { paginationSchema, buildPaginatedResult, buildPrismaArgs } from '../../utils/pagination.js';
import type { Prisma } from '@prisma/client';

export const auditRoutes: FastifyPluginAsync = async (app) => {
  const prisma = getPrisma();
  app.addHook('preHandler', authenticate);

  const auditFilterSchema = z.object({
    action: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    userId: z.string().optional(),
    agentId: z.string().optional(),
    correlationId: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  });

  app.get('/', async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const filters = auditFilterSchema.parse(request.query);

    const where: Prisma.AuditLogWhereInput = {};
    if (filters.action) where.action = { contains: filters.action };
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.agentId) where.agentId = filters.agentId;
    if (filters.correlationId) where.correlationId = filters.correlationId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        ...buildPrismaArgs(params),
        include: {
          user: { select: { id: true, name: true, email: true } },
          agent: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return reply.send(buildPaginatedResult(data, total, params));
  });
};
