import type { IntegrationPlugin, PluginConfig, PluginResult } from './IntegrationPlugin.js';
import { createBreaker } from '../utils/circuitBreaker.js';
import { logger } from '../utils/logger.js';
// @ts-expect-error no types for opossum
import CircuitBreaker from 'opossum';

export abstract class BasePlugin implements IntegrationPlugin {
  abstract id: string;
  abstract name: string;
  abstract version: string;

  protected config: PluginConfig = {};
  protected breaker!: CircuitBreaker<unknown[], PluginResult>;
  protected initialized = false;

  async initialize(config: PluginConfig): Promise<void> {
    this.config = config;
    this.breaker = createBreaker(
      async (...args: unknown[]) => this.executeInternal(args[0] as string, args[1]),
      `plugin-${this.id}`,
      { timeout: 15_000, errorThresholdPercentage: 50 },
    );
    this.initialized = true;
    logger.info(`Plugin ${this.name} initialized`);
  }

  async execute(action: string, payload: unknown): Promise<PluginResult> {
    if (!this.initialized) {
      return { success: false, error: `Plugin ${this.name} not initialized` };
    }
    try {
      return await this.breaker.fire(action, payload) as PluginResult;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.error(`Plugin ${this.name} execution failed`, { action, error });
      return { success: false, error };
    }
  }

  protected abstract executeInternal(action: string, payload: unknown): Promise<PluginResult>;

  abstract healthCheck(): Promise<boolean>;

  async verifyWebhook(_headers: Record<string, string>, _body: unknown): Promise<boolean> {
    return true; // Override in subclass for webhook signature verification
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    logger.info(`Plugin ${this.name} destroyed`);
  }
}
