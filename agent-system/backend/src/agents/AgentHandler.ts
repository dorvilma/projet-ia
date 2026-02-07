import type { ConsumeMessage } from 'amqplib';
import { logger } from '../utils/logger.js';
import type { AgentRoleType } from '../config/constants.js';

export interface AgentContext {
  correlationId: string;
  taskId: string;
  projectId: string;
  attempt: number;
}

export interface AgentResult {
  success: boolean;
  output?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskMessage {
  taskId: string;
  projectId: string;
  title: string;
  description?: string;
  type: string;
  input: Record<string, unknown>;
  priority: string;
  parentTaskId?: string;
  correlationId: string;
  attempt: number;
}

export abstract class AgentHandler {
  abstract readonly role: AgentRoleType;
  abstract readonly name: string;

  protected log = logger;

  async process(msg: ConsumeMessage): Promise<AgentResult> {
    const content = JSON.parse(msg.content.toString()) as TaskMessage;
    const ctx: AgentContext = {
      correlationId: content.correlationId,
      taskId: content.taskId,
      projectId: content.projectId,
      attempt: content.attempt || 1,
    };

    this.log.info(`[${this.name}] Processing task ${ctx.taskId}`, {
      correlationId: ctx.correlationId,
      role: this.role,
    });

    try {
      await this.onBeforeExecute(ctx, content);
      const result = await this.execute(ctx, content);
      await this.onAfterExecute(ctx, content, result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.log.error(`[${this.name}] Task ${ctx.taskId} failed`, {
        correlationId: ctx.correlationId,
        error: error.message,
        stack: error.stack,
      });
      return { success: false, error: error.message };
    }
  }

  protected abstract execute(ctx: AgentContext, task: TaskMessage): Promise<AgentResult>;

  protected async onBeforeExecute(_ctx: AgentContext, _task: TaskMessage): Promise<void> {
    // Override in subclass for pre-processing
  }

  protected async onAfterExecute(
    _ctx: AgentContext,
    _task: TaskMessage,
    _result: AgentResult,
  ): Promise<void> {
    // Override in subclass for post-processing
  }

  getHealthStatus(): { healthy: boolean; load: number } {
    return { healthy: true, load: 0 };
  }
}
