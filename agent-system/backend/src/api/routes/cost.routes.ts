import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { costService } from '../../services/cost.service.js';

export const costRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const { projectId } = z.object({ projectId: z.string().cuid().optional() }).parse(request.query);
    const breakdown = await costService.getBreakdown(projectId);
    return reply.send(breakdown);
  });

  app.post('/', async (request, reply) => {
    const body = z.object({
      projectId: z.string().cuid(),
      category: z.string().min(1),
      amount: z.number().positive(),
      description: z.string().optional(),
    }).parse(request.body);

    await costService.recordCost(body.projectId, body.category, body.amount, body.description);
    return reply.status(201).send({ ok: true });
  });
};
