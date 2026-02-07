export const AGENT_ROLES = [
  'MASTER_ORCHESTRATOR',
  'BACKEND_DEV',
  'FRONTEND_DEV',
  'DEVOPS',
  'QA',
  'SECURITY',
  'DATA_ENGINEER',
  'PERFORMANCE',
  'DOCUMENTATION',
  'PRODUCT_MANAGER',
  'SOLUTIONS_ARCHITECT',
  'TECH_LEAD',
] as const;

export type AgentRoleType = (typeof AGENT_ROLES)[number];

export const RABBITMQ_EXCHANGES = {
  TASKS: 'agent.tasks',
  RESULTS: 'agent.results',
  DLX: 'agent.dlx',
  RETRY: 'agent.retry',
} as const;

export const RABBITMQ_QUEUES = {
  MASTER: 'agent.master-orchestrator',
  BACKEND_DEV: 'agent.backend-dev',
  FRONTEND_DEV: 'agent.frontend-dev',
  DEVOPS: 'agent.devops',
  QA: 'agent.qa',
  SECURITY: 'agent.security',
  DATA_ENGINEER: 'agent.data-engineer',
  PERFORMANCE: 'agent.performance',
  DOCUMENTATION: 'agent.documentation',
  PRODUCT_MANAGER: 'agent.product-manager',
  SOLUTIONS_ARCHITECT: 'agent.solutions-architect',
  TECH_LEAD: 'agent.tech-lead',
  RESULTS: 'agent.results.master',
  DEAD_LETTERS: 'agent.dead-letters',
  RETRY_30S: 'agent.retry.30s',
  RETRY_60S: 'agent.retry.60s',
  RETRY_300S: 'agent.retry.300s',
} as const;

export const CONSUMPTION_MODES = {
  MINIMAL: {
    maxConcurrentAgents: 2,
    maxParallelTasks: 1,
    cacheEnabled: false,
    cacheTTL: 0,
    workerPoolSize: 1,
  },
  STANDARD: {
    maxConcurrentAgents: 6,
    maxParallelTasks: 5,
    cacheEnabled: true,
    cacheTTL: 3600,
    workerPoolSize: 4,
  },
  HIGH_PERFORMANCE: {
    maxConcurrentAgents: 20,
    maxParallelTasks: 15,
    cacheEnabled: true,
    cacheTTL: 7200,
    workerPoolSize: 8,
  },
} as const;

export const HEARTBEAT_INTERVAL_MS = 15_000;
export const HEARTBEAT_TIMEOUT_MS = 30_000;
export const MAX_RETRY_ATTEMPTS = 3;
export const DEFAULT_TASK_TIMEOUT_MS = 300_000; // 5 min
