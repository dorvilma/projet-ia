import { AgentHandler, type AgentContext, type AgentResult, type TaskMessage } from '../AgentHandler.js';
import { getPrisma } from '../../storage/PrismaClient.js';

export class SolutionsArchitectHandler extends AgentHandler {
  readonly role = 'SOLUTIONS_ARCHITECT' as const;
  readonly name = 'Solutions Architect';

  protected async execute(ctx: AgentContext, task: TaskMessage): Promise<AgentResult> {
    const prisma = getPrisma();

    await prisma.task.update({
      where: { id: ctx.taskId },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    // Record tool invocation
    const invocation = await prisma.toolInvocation.create({
      data: {
        taskId: ctx.taskId,
        toolName: 'code_generation',
        input: task.input as any,
        status: 'RUNNING',
      },
    });

    try {
      // Agent processes the task (placeholder for actual AI logic)
      const result = {
        analysis: `Analyzed architecture task: ${task.title}`,
        recommendations: ['Follow REST conventions', 'Add input validation', 'Include error handling'],
        codeStructure: task.input,
      };

      await prisma.toolInvocation.update({
        where: { id: invocation.id },
        data: { status: 'SUCCESS', output: result as any, durationMs: 100 },
      });

      return { success: true, output: result };
    } catch (err) {
      await prisma.toolInvocation.update({
        where: { id: invocation.id },
        data: { status: 'FAILED', error: String(err) },
      });
      throw err;
    }
  }
}
