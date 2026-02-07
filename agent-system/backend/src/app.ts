import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';
import { generateCorrelationId } from './utils/correlationId.js';
import { getPrisma } from './storage/PrismaClient.js';

// Route imports
import { authRoutes } from './api/routes/auth.routes.js';
import { projectRoutes } from './api/routes/projects.routes.js';
import { taskRoutes } from './api/routes/tasks.routes.js';
import { agentRoutes } from './api/routes/agents.routes.js';
import { rulesRoutes } from './api/routes/rules.routes.js';
import { monitoringRoutes } from './api/routes/monitoring.routes.js';
import { auditRoutes } from './api/routes/audit.routes.js';
import { settingsRoutes } from './api/routes/settings.routes.js';
import { integrationRoutes } from './api/routes/integrations.routes.js';
import { healthRoutes } from './api/routes/health.routes.js';
import { costRoutes } from './api/routes/cost.routes.js';
import { websocketRoutes } from './api/routes/websocket.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: false, // We use Winston
    requestTimeout: 30_000,
    bodyLimit: 1_048_576, // 1MB
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Correlation ID
  app.addHook('onRequest', async (request) => {
    (request as any).correlationId =
      (request.headers['x-correlation-id'] as string) || generateCorrelationId();
  });

  // Request logging
  app.addHook('onResponse', async (request, reply) => {
    logger.info(`${request.method} ${request.url} ${reply.statusCode}`, {
      correlationId: (request as any).correlationId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    });
  });

  // Plugins
  await app.register(cors, { origin: config.CORS_ORIGIN, credentials: true });
  await app.register(helmet, { contentSecurityPolicy: config.NODE_ENV === 'production' });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(jwt, { secret: config.JWT_SECRET });
  await app.register(websocket);

  // Decorate with Prisma
  const prisma = getPrisma();
  app.decorate('prisma', prisma);

  // Global error handler
  app.setErrorHandler(async (error: Error & { validation?: unknown; code?: string; statusCode?: number }, request, reply) => {
    const correlationId = (request as any).correlationId;

    if (error instanceof AppError) {
      logger.warn(error.message, { correlationId, code: error.code, statusCode: error.statusCode });
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        details: error.details,
        correlationId,
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
        correlationId,
      });
    }

    logger.error('Unhandled error', {
      correlationId,
      error: error.message,
      stack: error.stack,
    });

    return reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: config.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      correlationId,
    });
  });

  // Routes
  await app.register(healthRoutes, { prefix: '/api/health' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(taskRoutes, { prefix: '/api/tasks' });
  await app.register(agentRoutes, { prefix: '/api/agents' });
  await app.register(rulesRoutes, { prefix: '/api/rules' });
  await app.register(monitoringRoutes, { prefix: '/api/monitoring' });
  await app.register(auditRoutes, { prefix: '/api/audit' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(integrationRoutes, { prefix: '/api/integrations' });
  await app.register(costRoutes, { prefix: '/api/cost' });
  await app.register(websocketRoutes, { prefix: '/ws' });

  return app;
}
