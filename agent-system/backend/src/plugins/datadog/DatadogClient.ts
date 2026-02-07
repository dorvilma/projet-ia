import { logger } from '../../utils/logger.js';

export class DatadogClient {
  private baseUrl = 'https://api.datadoghq.com/api/v1';

  constructor(
    private apiKey?: string,
    private appKey?: string,
  ) {}

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['DD-API-KEY'] = this.apiKey;
    if (this.appKey) h['DD-APPLICATION-KEY'] = this.appKey;
    return h;
  }

  async sendMetric(metric: string, value: number, tags?: string[]): Promise<void> {
    if (!this.apiKey) {
      logger.debug('Datadog API key not configured, skipping metric');
      return;
    }

    const body = {
      series: [
        {
          metric: `agent_system.${metric}`,
          points: [[Math.floor(Date.now() / 1000), value]],
          type: 'gauge',
          tags: tags || [],
        },
      ],
    };

    try {
      const res = await fetch(`${this.baseUrl}/series`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        logger.warn('Datadog metric send failed', { status: res.status, metric });
      }
    } catch (err) {
      logger.warn('Datadog metric send error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async sendEvent(title: string, text: string, alertType?: string, tags?: string[]): Promise<void> {
    if (!this.apiKey) return;

    const body = {
      title,
      text,
      alert_type: alertType || 'info',
      tags: tags || [],
    };

    try {
      await fetch(`${this.baseUrl}/events`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });
    } catch (err) {
      logger.warn('Datadog event send error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${this.baseUrl}/validate`, {
        headers: this.headers,
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
