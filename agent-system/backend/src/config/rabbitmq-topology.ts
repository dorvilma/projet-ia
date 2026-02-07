import { RABBITMQ_EXCHANGES, RABBITMQ_QUEUES, AGENT_ROLES } from './constants.js';

export interface ExchangeDefinition {
  name: string;
  type: 'topic' | 'fanout' | 'direct';
  options: { durable: boolean };
}

export interface QueueDefinition {
  name: string;
  options: {
    durable: boolean;
    deadLetterExchange?: string;
    deadLetterRoutingKey?: string;
    messageTtl?: number;
  };
  bindings: Array<{ exchange: string; routingKey: string }>;
}

export const exchanges: ExchangeDefinition[] = [
  { name: RABBITMQ_EXCHANGES.TASKS, type: 'topic', options: { durable: true } },
  { name: RABBITMQ_EXCHANGES.RESULTS, type: 'topic', options: { durable: true } },
  { name: RABBITMQ_EXCHANGES.DLX, type: 'fanout', options: { durable: true } },
  { name: RABBITMQ_EXCHANGES.RETRY, type: 'topic', options: { durable: true } },
];

const agentRoleToQueue: Record<string, string> = {
  MASTER_ORCHESTRATOR: RABBITMQ_QUEUES.MASTER,
  BACKEND_DEV: RABBITMQ_QUEUES.BACKEND_DEV,
  FRONTEND_DEV: RABBITMQ_QUEUES.FRONTEND_DEV,
  DEVOPS: RABBITMQ_QUEUES.DEVOPS,
  QA: RABBITMQ_QUEUES.QA,
  SECURITY: RABBITMQ_QUEUES.SECURITY,
  DATA_ENGINEER: RABBITMQ_QUEUES.DATA_ENGINEER,
  PERFORMANCE: RABBITMQ_QUEUES.PERFORMANCE,
  DOCUMENTATION: RABBITMQ_QUEUES.DOCUMENTATION,
  PRODUCT_MANAGER: RABBITMQ_QUEUES.PRODUCT_MANAGER,
  SOLUTIONS_ARCHITECT: RABBITMQ_QUEUES.SOLUTIONS_ARCHITECT,
  TECH_LEAD: RABBITMQ_QUEUES.TECH_LEAD,
};

export function buildQueues(): QueueDefinition[] {
  const queues: QueueDefinition[] = [];

  for (const role of AGENT_ROLES) {
    const queueName = agentRoleToQueue[role];
    if (!queueName) continue;
    queues.push({
      name: queueName,
      options: {
        durable: true,
        deadLetterExchange: RABBITMQ_EXCHANGES.DLX,
        deadLetterRoutingKey: `dlx.${role.toLowerCase()}`,
      },
      bindings: [
        { exchange: RABBITMQ_EXCHANGES.TASKS, routingKey: `task.${role.toLowerCase()}.#` },
      ],
    });
  }

  // Results queue (Master consumes all results)
  queues.push({
    name: RABBITMQ_QUEUES.RESULTS,
    options: { durable: true },
    bindings: [{ exchange: RABBITMQ_EXCHANGES.RESULTS, routingKey: 'result.#' }],
  });

  // Dead letter queue
  queues.push({
    name: RABBITMQ_QUEUES.DEAD_LETTERS,
    options: { durable: true },
    bindings: [{ exchange: RABBITMQ_EXCHANGES.DLX, routingKey: '' }],
  });

  // Retry queues with TTL
  const retryConfigs = [
    { name: RABBITMQ_QUEUES.RETRY_30S, ttl: 30_000, key: 'retry.30s' },
    { name: RABBITMQ_QUEUES.RETRY_60S, ttl: 60_000, key: 'retry.60s' },
    { name: RABBITMQ_QUEUES.RETRY_300S, ttl: 300_000, key: 'retry.300s' },
  ];
  for (const rc of retryConfigs) {
    queues.push({
      name: rc.name,
      options: {
        durable: true,
        messageTtl: rc.ttl,
        deadLetterExchange: RABBITMQ_EXCHANGES.TASKS,
      },
      bindings: [{ exchange: RABBITMQ_EXCHANGES.RETRY, routingKey: rc.key }],
    });
  }

  return queues;
}
