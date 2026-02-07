import { AgentHandler, type AgentContext, type AgentResult, type TaskMessage } from '../AgentHandler.js';
import { RabbitMQManager } from '../../communication/RabbitMQManager.js';
import { getPrisma } from '../../storage/PrismaClient.js';
import { RABBITMQ_EXCHANGES } from '../../config/constants.js';
import type { AgentRoleType } from '../../config/constants.js';

const TASK_TYPE_TO_AGENT: Record<string, AgentRoleType> = {
  DEVELOPMENT: 'BACKEND_DEV',
  REVIEW: 'TECH_LEAD',
  TESTING: 'QA',
  DEPLOYMENT: 'DEVOPS',
  DOCUMENTATION: 'DOCUMENTATION',
  ARCHITECTURE: 'SOLUTIONS_ARCHITECT',
  SECURITY_AUDIT: 'SECURITY',
  PERFORMANCE: 'PERFORMANCE',
  DATA_ENGINEERING: 'DATA_ENGINEER',
  PRODUCT_MANAGEMENT: 'PRODUCT_MANAGER',
};

export class MasterOrchestratorHandler extends AgentHandler {
  readonly role = 'MASTER_ORCHESTRATOR' as const;
  readonly name = 'Orchestrator';

  protected async execute(ctx: AgentContext, task: TaskMessage): Promise<AgentResult> {
    const prisma = getPrisma();
    const rmq = RabbitMQManager.getInstance();

    // Determine target agent based on task type
    const targetRole = TASK_TYPE_TO_AGENT[task.type] || 'BACKEND_DEV';

    // Update task status to QUEUED
    await prisma.task.update({
      where: { id: ctx.taskId },
      data: { status: 'QUEUED' },
    });

    // Delegate to the appropriate agent
    const routingKey = `task.${targetRole.toLowerCase()}.${task.priority.toLowerCase()}`;
    await rmq.publish(RABBITMQ_EXCHANGES.TASKS, routingKey, {
      ...task,
      delegatedBy: this.role,
      delegatedAt: new Date().toISOString(),
    }, { correlationId: ctx.correlationId });

    // Create agent assignment
    const agent = await prisma.agent.findUnique({ where: { role: targetRole } });
    if (agent) {
      await prisma.agentAssignment.create({
        data: {
          agentId: agent.id,
          taskId: ctx.taskId,
          projectId: ctx.projectId,
        },
      }).catch(() => {
        // Assignment might already exist
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        correlationId: ctx.correlationId,
        agentId: agent?.id,
        taskId: ctx.taskId,
        action: 'task.delegated',
        entityType: 'task',
        entityId: ctx.taskId,
        metadata: { targetRole, routingKey, priority: task.priority },
      },
    });

    this.log.info(`Delegated task ${ctx.taskId} to ${targetRole}`, {
      correlationId: ctx.correlationId,
    });

    return {
      success: true,
      output: { delegatedTo: targetRole, routingKey },
      metadata: { delegatedAt: new Date().toISOString() },
    };
  }
}
