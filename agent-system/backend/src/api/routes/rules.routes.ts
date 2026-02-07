import type { FastifyPluginAsync } from 'fastify';
import { getPrisma } from '../../storage/PrismaClient.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { idParamSchema, createPromptSchema, createRuleSchema } from '../schemas/common.schema.js';
import { NotFoundError } from '../../utils/errors.js';

export const rulesRoutes: FastifyPluginAsync = async (app) => {
  const prisma = getPrisma();
  app.addHook('preHandler', authenticate);

  // --- Prompts ---
  app.get('/prompts', async (request, reply) => {
    const prompts = await prisma.agentPrompt.findMany({
      where: { isActive: true },
      orderBy: [{ agentRole: 'asc' }, { version: 'desc' }],
    });
    return reply.send(prompts);
  });

  app.post('/prompts', async (request, reply) => {
    const body = createPromptSchema.parse(request.body);
    // Deactivate previous versions
    await prisma.agentPrompt.updateMany({
      where: { agentRole: body.agentRole, name: body.name, isActive: true },
      data: { isActive: false },
    });

    const latestVersion = await prisma.agentPrompt.findFirst({
      where: { agentRole: body.agentRole, name: body.name },
      orderBy: { version: 'desc' },
    });

    const prompt = await prisma.agentPrompt.create({
      data: {
        agentRole: body.agentRole,
        name: body.name,
        content: body.content,
        version: (latestVersion?.version ?? 0) + 1,
      },
    });
    return reply.status(201).send(prompt);
  });

  app.delete('/prompts/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const prompt = await prisma.agentPrompt.findUnique({ where: { id } });
    if (!prompt) throw new NotFoundError('Prompt', id);
    await prisma.agentPrompt.update({ where: { id }, data: { isActive: false } });
    return reply.status(204).send();
  });

  // --- Rules ---
  app.get('/rules', async (request, reply) => {
    const rules = await prisma.agentRule.findMany({
      where: { isActive: true },
      orderBy: [{ agentRole: 'asc' }, { priority: 'desc' }],
    });
    return reply.send(rules);
  });

  app.post('/rules', async (request, reply) => {
    const body = createRuleSchema.parse(request.body);
    await prisma.agentRule.updateMany({
      where: { agentRole: body.agentRole, name: body.name, isActive: true },
      data: { isActive: false },
    });

    const latestVersion = await prisma.agentRule.findFirst({
      where: { agentRole: body.agentRole, name: body.name },
      orderBy: { version: 'desc' },
    });

    const rule = await prisma.agentRule.create({
      data: {
        agentRole: body.agentRole,
        name: body.name,
        conditions: body.conditions as any,
        actions: body.actions as any,
        priority: body.priority ?? 0,
        version: (latestVersion?.version ?? 0) + 1,
      },
    });
    return reply.status(201).send(rule);
  });

  app.delete('/rules/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const rule = await prisma.agentRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundError('Rule', id);
    await prisma.agentRule.update({ where: { id }, data: { isActive: false } });
    return reply.status(204).send();
  });
};
