import { BasePlugin } from '../BasePlugin.js';
import type { PluginResult } from '../IntegrationPlugin.js';
import { SlackClient } from './SlackClient.js';
import { logger } from '../../utils/logger.js';

export class SlackPlugin extends BasePlugin {
  id = 'slack';
  name = 'Slack Notifications';
  version = '1.0.0';

  private client!: SlackClient;

  protected async executeInternal(action: string, payload: unknown): Promise<PluginResult> {
    if (!this.client) {
      this.client = new SlackClient(
        this.config.webhookUrl as string,
        this.config.botToken as string | undefined,
      );
    }

    switch (action) {
      case 'send_notification': {
        const p = payload as { channel?: string; text: string; blocks?: unknown[] };
        await this.client.sendWebhook(p.text, p.blocks);
        return { success: true };
      }

      case 'task_completed': {
        const p = payload as { taskId: string; title: string; agent: string };
        await this.client.sendWebhook(
          `Task completed: *${p.title}* (by ${p.agent})`,
          [
            { type: 'section', text: { type: 'mrkdwn', text: `*Task Completed*\n>${p.title}\nAgent: ${p.agent}\nID: \`${p.taskId}\`` } },
          ],
        );
        return { success: true };
      }

      case 'task_failed': {
        const p = payload as { taskId: string; title: string; error: string };
        await this.client.sendWebhook(
          `Task failed: ${p.title} - ${p.error}`,
          [
            { type: 'section', text: { type: 'mrkdwn', text: `:red_circle: *Task Failed*\n>${p.title}\nError: ${p.error}\nID: \`${p.taskId}\`` } },
          ],
        );
        return { success: true };
      }

      case 'alert': {
        const p = payload as { severity: string; message: string };
        await this.client.sendWebhook(`[${p.severity}] ${p.message}`);
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  async healthCheck(): Promise<boolean> {
    return !!this.config.webhookUrl;
  }
}
