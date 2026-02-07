import { BasePlugin } from '../BasePlugin.js';
import type { PluginResult } from '../IntegrationPlugin.js';
import { GitHubClient } from './GitHubClient.js';
import { logger } from '../../utils/logger.js';
import { createHmac } from 'crypto';

export class GitHubPlugin extends BasePlugin {
  id = 'github';
  name = 'GitHub Integration';
  version = '1.0.0';

  private client!: GitHubClient;

  protected async executeInternal(action: string, payload: unknown): Promise<PluginResult> {
    if (!this.client) {
      this.client = new GitHubClient(this.config.token as string);
    }

    switch (action) {
      case 'create_issue': {
        const p = payload as { owner: string; repo: string; title: string; body?: string; labels?: string[] };
        const issue = await this.client.createIssue(p.owner, p.repo, p.title, p.body, p.labels);
        return { success: true, data: issue };
      }

      case 'create_pr_comment': {
        const p = payload as { owner: string; repo: string; prNumber: number; body: string };
        await this.client.createPRComment(p.owner, p.repo, p.prNumber, p.body);
        return { success: true };
      }

      case 'get_repo': {
        const p = payload as { owner: string; repo: string };
        const repo = await this.client.getRepo(p.owner, p.repo);
        return { success: true, data: repo };
      }

      case 'handle_webhook': {
        const p = payload as { event: string; data: unknown };
        logger.info(`GitHub webhook: ${p.event}`);
        return { success: true, data: { event: p.event, processed: true } };
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  async verifyWebhook(headers: Record<string, string>, body: unknown): Promise<boolean> {
    const secret = this.config.webhookSecret as string;
    if (!secret) return true;

    const signature = headers['x-hub-signature-256'];
    if (!signature) return false;

    const hmac = createHmac('sha256', secret);
    hmac.update(JSON.stringify(body));
    const expected = `sha256=${hmac.digest('hex')}`;

    return signature === expected;
  }

  async healthCheck(): Promise<boolean> {
    return !!this.config.token;
  }
}
