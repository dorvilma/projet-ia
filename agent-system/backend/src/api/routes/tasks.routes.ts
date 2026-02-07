import type { FastifyPluginAsync } from 'fastify';
import { taskService } from '../../services/task.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { idParamSchema, createTaskSchema, taskFilterSchema } from '../schemas/common.schema.js';
import { paginationSchema } from '../../utils/pagination.js';

export const taskRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const filters = taskFilterSchema.parse(request.query);
    const result = await taskService.findMany(params, filters);
    return reply.send(result);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const task = await taskService.findById(id);
    return reply.send(task);
  });

  app.post('/', async (request, reply) => {
    const body = createTaskSchema.parse(request.body);
    const { sub } = request.user as { sub: string };
    const task = await taskService.create(body, sub);
    return reply.status(201).send(task);
  });

  app.post('/:id/retry', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const task = await taskService.retry(id);
    return reply.send(task);
  });

  app.post('/:id/cancel', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const task = await taskService.cancel(id);
    return reply.send(task);
  });
};
