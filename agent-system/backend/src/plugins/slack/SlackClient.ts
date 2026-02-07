import { logger } from '../../utils/logger.js';

export class SlackClient {
  constructor(
    private webhookUrl?: string,
    private botToken?: string,
  ) {}

  async sendWebhook(text: string, blocks?: unknown[]): Promise<void> {
    if (!this.webhookUrl) {
      logger.debug('Slack webhook URL not configured, skipping notification');
      return;
    }

    const body: Record<string, unknown> = { text };
    if (blocks) body.blocks = blocks;

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }
  }

  async postMessage(channel: string, text: string, blocks?: unknown[]): Promise<void> {
    if (!this.botToken) {
      logger.debug('Slack bot token not configured, skipping message');
      return;
    }

    const body: Record<string, unknown> = { channel, text };
    if (blocks) body.blocks = blocks;

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.botToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Slack API failed: ${response.status}`);
    }
  }
}
