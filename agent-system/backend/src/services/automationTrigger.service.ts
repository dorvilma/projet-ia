import { getPrisma } from '../storage/PrismaClient.js';
import { PluginRegistry } from '../plugins/PluginRegistry.js';
import { logger } from '../utils/logger.js';

export class AutomationTriggerService {
  private prisma = getPrisma();

  async evaluate(eventType: string, eventData: Record<string, unknown>): Promise<void> {
    // Find active triggers matching this event type
    const triggers = await this.prisma.automationTrigger.findMany({
      where: { eventType, isActive: true },
      include: { n8nWorkflow: true },
    });

    for (const trigger of triggers) {
      try {
        // Check conditions
        if (!this.matchesConditions(trigger.conditions as Record<string, unknown>, eventData)) {
          continue;
        }

        // Fire the trigger
        if (trigger.n8nWorkflow?.webhookUrl) {
          const pluginRegistry = PluginRegistry.getInstance();
          await pluginRegistry.execute('n8n', 'trigger_workflow', {
            workflowId: trigger.n8nWorkflow.n8nWorkflowId,
            data: { event: eventType, ...eventData },
          });
        }

        // Update trigger stats
        await this.prisma.automationTrigger.update({
          where: { id: trigger.id },
          data: {
            lastFiredAt: new Date(),
            fireCount: { increment: 1 },
          },
        });

        logger.info(`Automation trigger fired: ${trigger.name}`, { eventType, triggerId: trigger.id });
      } catch (err) {
        logger.error(`Automation trigger error: ${trigger.name}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private matchesConditions(
    conditions: Record<string, unknown>,
    eventData: Record<string, unknown>,
  ): boolean {
    // Simple condition matching - check if all condition keys match event data
    if (!conditions || Object.keys(conditions).length === 0) return true;

    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = eventData[key];
      if (actualValue !== expectedValue) return false;
    }
    return true;
  }
}

export const automationTriggerService = new AutomationTriggerService();
