import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getPrisma } from '../../storage/PrismaClient.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { paginationSchema, buildPaginatedResult, buildPrismaArgs } from '../../utils/pagination.js';
import { NotFoundError } from '../../utils/errors.js';

export const agentRoutes: FastifyPluginAsync = async (app) => {
  const prisma = getPrisma();
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const [data, total] = await Promise.all([
      prisma.agent.findMany({
        ...buildPrismaArgs(params),
        include: { _count: { select: { assignments: true } } },
        orderBy: { role: 'asc' },
      }),
      prisma.agent.count(),
    ]);
    return reply.send(buildPaginatedResult(data, total, params));
  });

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        assignments: { take: 10, orderBy: { assignedAt: 'desc' }, include: { task: true } },
        metrics: { take: 20, orderBy: { recordedAt: 'desc' } },
      },
    });
    if (!agent) throw new NotFoundError('Agent', id);
    return reply.send(agent);
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = z.object({
      config: z.record(z.unknown()).optional(),
      maxLoad: z.number().int().min(1).optional(),
      status: z.enum(['IDLE', 'BUSY', 'OVERLOADED', 'ERROR', 'OFFLINE', 'MAINTENANCE']).optional(),
    }).parse(request.body);

    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) throw new NotFoundError('Agent', id);

    const updated = await prisma.agent.update({
      where: { id },
      data: {
        ...(body.config && { config: body.config as any }),
        ...(body.maxLoad !== undefined && { maxLoad: body.maxLoad }),
        ...(body.status && { status: body.status }),
      },
    });
    return reply.send(updated);
  });

  app.get('/:id/prompts', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) throw new NotFoundError('Agent', id);

    const prompts = await prisma.agentPrompt.findMany({
      where: { agentRole: agent.role, isActive: true },
      orderBy: { version: 'desc' },
    });
    return reply.send(prompts);
  });

  app.get('/:id/rules', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) throw new NotFoundError('Agent', id);

    const rules = await prisma.agentRule.findMany({
      where: { agentRole: agent.role, isActive: true },
      orderBy: { priority: 'desc' },
    });
    return reply.send(rules);
  });
};
