import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getPrisma } from '../../storage/PrismaClient.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { idParamSchema, createIntegrationSchema, updateIntegrationSchema, webhookBodySchema } from '../schemas/common.schema.js';
import { PluginRegistry } from '../../plugins/PluginRegistry.js';
import { NotFoundError } from '../../utils/errors.js';

export const integrationRoutes: FastifyPluginAsync = async (app) => {
  const prisma = getPrisma();

  // Webhook endpoint (no auth - verified by plugin)
  app.post('/:pluginId/webhook', async (request, reply) => {
    const { pluginId } = z.object({ pluginId: z.string() }).parse(request.params);
    const body = webhookBodySchema.parse(request.body);

    const integration = await prisma.integration.findUnique({ where: { pluginId } });
    if (!integration) throw new NotFoundError('Integration', pluginId);

    // Log the webhook event
    await prisma.integrationWebhookEvent.create({
      data: {
        integrationId: integration.id,
        eventType: (body.event as string) || 'unknown',
        payload: body as any,
      },
    });

    const registry = PluginRegistry.getInstance();
    const result = await registry.execute(pluginId, 'handle_webhook', {
      headers: request.headers,
      body,
    });

    return reply.send({ received: true, result });
  });

  // Protected routes below
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticate);

    protectedApp.get('/', async (_request, reply) => {
      const integrations = await prisma.integration.findMany({ orderBy: { name: 'asc' } });
      return reply.send(integrations);
    });

    protectedApp.get('/:id', async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const integration = await prisma.integration.findUnique({
        where: { id },
        include: { webhookEvents: { take: 20, orderBy: { createdAt: 'desc' } } },
      });
      if (!integration) throw new NotFoundError('Integration', id);
      return reply.send(integration);
    });

    protectedApp.post('/', async (request, reply) => {
      const body = createIntegrationSchema.parse(request.body);
      const integration = await prisma.integration.create({
        data: {
          pluginId: body.pluginId,
          name: body.name,
          type: body.type,
          config: (body.config || {}) as any,
        },
      });
      return reply.status(201).send(integration);
    });

    protectedApp.patch('/:id', async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = updateIntegrationSchema.parse(request.body);
      const integration = await prisma.integration.findUnique({ where: { id } });
      if (!integration) throw new NotFoundError('Integration', id);

      const updated = await prisma.integration.update({
        where: { id },
        data: {
          ...(body.config && { config: body.config as any }),
          ...(body.status && { status: body.status }),
        },
      });
      return reply.send(updated);
    });

    protectedApp.get('/health', async (_request, reply) => {
      const registry = PluginRegistry.getInstance();
      const results = await registry.healthCheckAll();
      return reply.send(results);
    });
  });
};
