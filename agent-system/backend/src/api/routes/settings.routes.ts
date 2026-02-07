import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getPrisma } from '../../storage/PrismaClient.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { NotFoundError } from '../../utils/errors.js';

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  const prisma = getPrisma();
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const { category } = z.object({ category: z.string().optional() }).parse(request.query);
    const where = category ? { category } : {};
    const settings = await prisma.systemSetting.findMany({ where, orderBy: { key: 'asc' } });
    return reply.send(settings);
  });

  app.get('/:key', async (request, reply) => {
    const { key } = z.object({ key: z.string() }).parse(request.params);
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundError('Setting', key);
    return reply.send(setting);
  });

  app.put('/:key', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { key } = z.object({ key: z.string() }).parse(request.params);
    const { value } = z.object({ value: z.unknown() }).parse(request.body);

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    });
    return reply.send(setting);
  });
};
