import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export interface N8nWorkflowExecution {
  id: string;
  finished: boolean;
  data?: unknown;
}

export class N8nClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.N8N_BASE_URL;
  }

  async triggerWebhook(webhookUrl: string, data: unknown): Promise<unknown> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getWorkflows(): Promise<unknown[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      logger.warn('Failed to fetch n8n workflows', { status: response.status });
      return [];
    }

    const result = await response.json();
    return (result as { data: unknown[] }).data || [];
  }

  async getWorkflow(id: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/api/v1/workflows/${id}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflow ${id}: ${response.status}`);
    }

    return response.json();
  }

  async activateWorkflow(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/workflows/${id}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async deactivateWorkflow(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/workflows/${id}/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
