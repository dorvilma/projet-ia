import type { IntegrationPlugin, PluginConfig, PluginResult } from './IntegrationPlugin.js';
import { logger } from '../utils/logger.js';
import { getPrisma } from '../storage/PrismaClient.js';

export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins = new Map<string, IntegrationPlugin>();

  private constructor() {}

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  register(plugin: IntegrationPlugin): void {
    this.plugins.set(plugin.id, plugin);
    logger.info(`Plugin registered: ${plugin.name} (${plugin.id})`);
  }

  async initializePlugin(pluginId: string, config?: PluginConfig): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Load config from DB if not provided
    if (!config) {
      const prisma = getPrisma();
      const integration = await prisma.integration.findUnique({
        where: { pluginId },
      });
      config = (integration?.config as PluginConfig) || {};
    }

    await plugin.initialize(config);

    // Update status in DB
    const prisma = getPrisma();
    await prisma.integration.update({
      where: { pluginId },
      data: { status: 'ACTIVE', lastSyncAt: new Date() },
    }).catch(() => {
      // Integration record might not exist
    });
  }

  async initializeAll(): Promise<void> {
    for (const [id] of this.plugins) {
      try {
        await this.initializePlugin(id);
      } catch (err) {
        logger.warn(`Failed to initialize plugin ${id}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  get(pluginId: string): IntegrationPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  async execute(pluginId: string, action: string, payload: unknown): Promise<PluginResult> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return { success: false, error: `Plugin ${pluginId} not found` };
    }
    return plugin.execute(action, payload);
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [id, plugin] of this.plugins) {
      try {
        results[id] = await plugin.healthCheck();
      } catch {
        results[id] = false;
      }
    }
    return results;
  }

  getAll(): Map<string, IntegrationPlugin> {
    return this.plugins;
  }

  async destroyAll(): Promise<void> {
    for (const [, plugin] of this.plugins) {
      await plugin.destroy().catch(() => {});
    }
    this.plugins.clear();
  }
}
