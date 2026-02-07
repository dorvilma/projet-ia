import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import type { AgentRoleType } from '../config/constants.js';
import { AGENT_ROLES } from '../config/constants.js';

export interface AgentConfig {
  role: AgentRoleType;
  maxLoad: number;
  timeout: number;
  retryPolicy: { maxAttempts: number; backoffMultiplier: number };
  capabilities: string[];
  prompt: string;
  rules: AgentRuleConfig[];
}

export interface AgentRuleConfig {
  name: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  priority: number;
}

const roleToFileKey: Record<string, string> = {
  MASTER_ORCHESTRATOR: 'master-orchestrator',
  BACKEND_DEV: 'backend-dev',
  FRONTEND_DEV: 'frontend-dev',
  DEVOPS: 'devops',
  QA: 'qa',
  SECURITY: 'security',
  DATA_ENGINEER: 'data-engineer',
  PERFORMANCE: 'performance',
  DOCUMENTATION: 'documentation',
  PRODUCT_MANAGER: 'product-manager',
  SOLUTIONS_ARCHITECT: 'solutions-architect',
  TECH_LEAD: 'tech-lead',
};

export class AgentRegistry {
  private configs = new Map<AgentRoleType, AgentConfig>();
  private pluginsPath: string;

  constructor(pluginsPath?: string) {
    this.pluginsPath = pluginsPath || join(process.cwd(), 'plugins');
  }

  async loadAll(): Promise<void> {
    // Load defaults
    const defaultsPath = join(this.pluginsPath, 'config', 'agent-defaults.json');
    let defaults: Record<string, Record<string, unknown>> = {};
    if (existsSync(defaultsPath)) {
      const raw = readFileSync(defaultsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      defaults = parsed.agents || {};
    }

    for (const role of AGENT_ROLES) {
      const fileKey = roleToFileKey[role] || role.toLowerCase().replace(/_/g, '-');
      const agentDefaults = defaults[role] || {};

      // Load prompt
      let prompt = '';
      const promptPath = join(this.pluginsPath, 'prompts', `${fileKey}.md`);
      if (existsSync(promptPath)) {
        prompt = readFileSync(promptPath, 'utf-8');
      }

      // Load rules
      let rules: AgentRuleConfig[] = [];
      const rulesPath = join(this.pluginsPath, 'rules', `${fileKey}.json`);
      if (existsSync(rulesPath)) {
        const raw = readFileSync(rulesPath, 'utf-8');
        const parsed = JSON.parse(raw);
        rules = parsed.rules || [];
      }

      const config: AgentConfig = {
        role,
        maxLoad: (agentDefaults.maxLoad as number) || 5,
        timeout: (agentDefaults.timeout as number) || 300_000,
        retryPolicy: (agentDefaults.retryPolicy as { maxAttempts: number; backoffMultiplier: number }) || {
          maxAttempts: 3,
          backoffMultiplier: 2,
        },
        capabilities: (agentDefaults.capabilities as string[]) || [],
        prompt,
        rules,
      };

      this.configs.set(role, config);
      logger.debug(`Loaded config for agent: ${role}`, { capabilities: config.capabilities.length });
    }

    logger.info(`AgentRegistry loaded ${this.configs.size} agent configurations`);
  }

  get(role: AgentRoleType): AgentConfig | undefined {
    return this.configs.get(role);
  }

  getAll(): Map<AgentRoleType, AgentConfig> {
    return this.configs;
  }

  reload(): Promise<void> {
    this.configs.clear();
    return this.loadAll();
  }
}
