import { BasePlugin } from '../BasePlugin.js';
import type { PluginResult } from '../IntegrationPlugin.js';
import { DatadogClient } from './DatadogClient.js';
import { logger } from '../../utils/logger.js';

export class DatadogPlugin extends BasePlugin {
  id = 'datadog';
  name = 'Datadog Monitoring';
  version = '1.0.0';

  private client!: DatadogClient;

  protected async executeInternal(action: string, payload: unknown): Promise<PluginResult> {
    if (!this.client) {
      this.client = new DatadogClient(
        this.config.apiKey as string,
        this.config.appKey as string | undefined,
      );
    }

    switch (action) {
      case 'send_metric': {
        const p = payload as { metric: string; value: number; tags?: string[] };
        await this.client.sendMetric(p.metric, p.value, p.tags);
        return { success: true };
      }

      case 'send_event': {
        const p = payload as { title: string; text: string; alertType?: string; tags?: string[] };
        await this.client.sendEvent(p.title, p.text, p.alertType, p.tags);
        return { success: true };
      }

      case 'get_metrics': {
        return { success: true, data: { message: 'Datadog metrics query not implemented' } };
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    return this.client?.healthCheck() ?? false;
  }
}
