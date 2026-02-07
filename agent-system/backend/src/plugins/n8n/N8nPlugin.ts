import { BasePlugin } from '../BasePlugin.js';
import type { PluginConfig, PluginResult } from '../IntegrationPlugin.js';
import { N8nClient } from './N8nClient.js';
import { logger } from '../../utils/logger.js';
import { getPrisma } from '../../storage/PrismaClient.js';

export class N8nPlugin extends BasePlugin {
  id = 'n8n';
  name = 'n8n Workflow Automation';
  version = '1.0.0';

  private client!: N8nClient;

  async initialize(config: PluginConfig): Promise<void> {
    await super.initialize(config);
    this.client = new N8nClient(config.baseUrl as string | undefined);
    logger.info('n8n plugin initialized');
  }

  protected async executeInternal(action: string, payload: unknown): Promise<PluginResult> {
    switch (action) {
      case 'trigger_workflow':
        return this.triggerWorkflow(payload as { workflowId: string; data: unknown });

      case 'list_workflows':
        return this.listWorkflows();

      case 'handle_webhook':
        return this.handleIncomingWebhook(payload);

      case 'get_workflow':
        return this.getWorkflow(payload as { workflowId: string });

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  private async triggerWorkflow(params: { workflowId: string; data: unknown }): Promise<PluginResult> {
    const prisma = getPrisma();

    // Find the workflow's webhook URL
    const workflow = await prisma.n8nWorkflow.findFirst({
      where: { n8nWorkflowId: params.workflowId, isActive: true },
    });

    if (!workflow?.webhookUrl) {
      return { success: false, error: `Workflow ${params.workflowId} not found or has no webhook URL` };
    }

    const result = await this.client.triggerWebhook(workflow.webhookUrl, params.data);

    // Update last triggered
    await prisma.n8nWorkflow.update({
      where: { id: workflow.id },
      data: { lastTriggeredAt: new Date() },
    });

    logger.info(`Triggered n8n workflow: ${params.workflowId}`);
    return { success: true, data: result };
  }

  private async listWorkflows(): Promise<PluginResult> {
    const workflows = await this.client.getWorkflows();
    return { success: true, data: workflows };
  }

  private async handleIncomingWebhook(payload: unknown): Promise<PluginResult> {
    // Process incoming n8n webhook (n8n -> Agent System)
    const data = payload as Record<string, unknown>;
    logger.info('Received n8n webhook', { type: data.type });

    // If the webhook creates a task, process it
    if (data.action === 'create_task' && data.task) {
      const prisma = getPrisma();
      const taskData = data.task as { projectId: string; title: string; description?: string; type?: string };
      const task = await prisma.task.create({
        data: {
          projectId: taskData.projectId,
          title: taskData.title,
          description: taskData.description,
          type: (taskData.type as any) || 'DEVELOPMENT',
        },
      });

      return { success: true, data: { taskId: task.id, message: 'Task created from n8n webhook' } };
    }

    return { success: true, data: { received: true } };
  }

  private async getWorkflow(params: { workflowId: string }): Promise<PluginResult> {
    const workflow = await this.client.getWorkflow(params.workflowId);
    return { success: true, data: workflow };
  }

  async healthCheck(): Promise<boolean> {
    return this.client.healthCheck();
  }
}
