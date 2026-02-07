import { logger } from '../../utils/logger.js';
import { getPrisma } from '../../storage/PrismaClient.js';
import { RabbitMQManager } from '../../communication/RabbitMQManager.js';
import { RABBITMQ_EXCHANGES } from '../../config/constants.js';
import { generateCorrelationId } from '../../utils/correlationId.js';

export async function handleN8nWebhook(payload: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  const prisma = getPrisma();
  const correlationId = generateCorrelationId();

  logger.info('Processing n8n webhook', { correlationId, action: payload.action });

  // Log the webhook event
  await prisma.integrationWebhookEvent.create({
    data: {
      integrationId: (await prisma.integration.findUnique({ where: { pluginId: 'n8n' } }))?.id || '',
      eventType: String(payload.action || 'unknown'),
      payload: payload as any,
      status: 'processing',
    },
  }).catch(() => {});

  const action = payload.action as string;

  switch (action) {
    case 'create_task': {
      const taskData = payload.task as Record<string, string>;
      if (!taskData?.projectId || !taskData?.title) {
        return { success: false, message: 'Missing projectId or title' };
      }

      const task = await prisma.task.create({
        data: {
          projectId: taskData.projectId,
          title: taskData.title,
          description: taskData.description,
          type: (taskData.type as any) || 'DEVELOPMENT',
          priority: (taskData.priority as any) || 'MEDIUM',
        },
      });

      // Publish to Master orchestrator for delegation
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
          input: {},
          correlationId,
          attempt: 1,
          source: 'n8n',
        },
        { correlationId },
      );

      return { success: true, message: `Task created: ${task.id}` };
    }

    case 'trigger_scan': {
      return { success: true, message: 'Scan triggered' };
    }

    default:
      return { success: false, message: `Unknown action: ${action}` };
  }
}
