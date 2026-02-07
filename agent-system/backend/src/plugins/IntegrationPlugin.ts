export interface PluginConfig {
  [key: string]: unknown;
}

export interface PluginResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface IntegrationPlugin {
  id: string;
  name: string;
  version: string;

  initialize(config: PluginConfig): Promise<void>;
  execute(action: string, payload: unknown): Promise<PluginResult>;
  healthCheck(): Promise<boolean>;
  verifyWebhook?(headers: Record<string, string>, body: unknown): Promise<boolean>;
  destroy(): Promise<void>;
}
