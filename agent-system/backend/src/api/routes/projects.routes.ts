import type { FastifyPluginAsync } from 'fastify';
import { projectService } from '../../services/project.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { idParamSchema, createProjectSchema, updateProjectSchema } from '../schemas/common.schema.js';
import { paginationSchema } from '../../utils/pagination.js';

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const result = await projectService.findMany(params);
    return reply.send(result);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const project = await projectService.findById(id);
    return reply.send(project);
  });

  app.post('/', async (request, reply) => {
    const body = createProjectSchema.parse(request.body);
    const { sub } = request.user as { sub: string };
    const project = await projectService.create(body, sub);
    return reply.status(201).send(project);
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateProjectSchema.parse(request.body);
    const project = await projectService.update(id, body);
    return reply.send(project);
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await projectService.delete(id);
    return reply.status(204).send();
  });
};
