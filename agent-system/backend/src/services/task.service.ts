import { getPrisma } from '../storage/PrismaClient.js';
import { RabbitMQManager } from '../communication/RabbitMQManager.js';
import { RABBITMQ_EXCHANGES } from '../config/constants.js';
import { generateCorrelationId } from '../utils/correlationId.js';
import { WebSocketServer } from '../realtime/WebSocketServer.js';
import { WS_EVENTS } from '../realtime/EventTypes.js';
import { NotFoundError } from '../utils/errors.js';
import { buildPaginatedResult, buildPrismaArgs, type PaginationParams } from '../utils/pagination.js';
import type { Prisma } from '@prisma/client';

interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  priority?: string;
  type?: string;
  parentTaskId?: string;
  input?: Record<string, unknown>;
}

export class TaskService {
  private prisma = getPrisma();

  async create(data: CreateTaskInput, userId?: string) {
    const correlationId = generateCorrelationId();

    const task = await this.prisma.task.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        priority: (data.priority as any) || 'MEDIUM',
        type: (data.type as any) || 'DEVELOPMENT',
        parentTaskId: data.parentTaskId,
        input: (data.input || {}) as any,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        correlationId,
        userId,
        action: 'task.created',
        entityType: 'task',
        entityId: task.id,
        after: task as any,
      },
    });

    // Publish to Master for delegation
    const rmq = RabbitMQManager.getInstance();
    await rmq.publish(
      RABBITMQ_EXCHANGES.TASKS,
      'task.master_orchestrator.medium',
      {
        taskId: task.id,
        projectId: task.projectId,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        input: task.input,
        parentTaskId: task.parentTaskId,
        correlationId,
        attempt: 1,
      },
      { correlationId },
    );

    // Broadcast via WebSocket
    WebSocketServer.getInstance().broadcast(WS_EVENTS.TASK_CREATED, task);

    return task;
  }

  async findMany(params: PaginationParams, filters?: { projectId?: string; status?: string; priority?: string }) {
    const where: Prisma.TaskWhereInput = {};
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.status) where.status = filters.status as any;
    if (filters?.priority) where.priority = filters.priority as any;

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        ...buildPrismaArgs(params),
        include: { agentAssignment: { include: { agent: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    return buildPaginatedResult(data, total, params);
  }

  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        subtasks: true,
        agentAssignment: { include: { agent: true } },
        toolInvocations: { orderBy: { createdAt: 'desc' } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!task) throw new NotFoundError('Task', id);
    return task;
  }

  async retry(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundError('Task', id);

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: 'RETRYING',
        retryCount: { increment: 1 },
        errorMessage: null,
      },
    });

    const correlationId = generateCorrelationId();
    const rmq = RabbitMQManager.getInstance();
    await rmq.publish(
      RABBITMQ_EXCHANGES.TASKS,
      'task.master_orchestrator.medium',
      {
        taskId: task.id,
        projectId: task.projectId,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        input: task.input,
        correlationId,
        attempt: task.retryCount + 1,
      },
      { correlationId },
    );

    return updated;
  }

  async cancel(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundError('Task', id);

    return this.prisma.task.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }
}

export const taskService = new TaskService();
