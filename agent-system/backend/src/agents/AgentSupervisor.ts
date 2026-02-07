import { logger } from '../utils/logger.js';
import { getPrisma } from '../storage/PrismaClient.js';
import { getRedis } from '../storage/RedisClient.js';
import { RabbitMQManager } from '../communication/RabbitMQManager.js';
import { AgentRegistry, type AgentConfig } from './AgentRegistry.js';
import { AgentHandler, type TaskMessage, type AgentResult } from './AgentHandler.js';
import { AGENT_ROLES, RABBITMQ_EXCHANGES, RABBITMQ_QUEUES, HEARTBEAT_INTERVAL_MS, HEARTBEAT_TIMEOUT_MS } from '../config/constants.js';
import type { AgentRoleType } from '../config/constants.js';
import { getConsumptionMode, type ConsumptionModeKey } from '../config/consumption-modes.js';
import { registerShutdownHandler } from '../utils/gracefulShutdown.js';

// Import handlers
import { MasterOrchestratorHandler } from './handlers/MasterOrchestratorHandler.js';
import { BackendDevHandler } from './handlers/BackendDevHandler.js';
import { FrontendDevHandler } from './handlers/FrontendDevHandler.js';
import { DevOpsHandler } from './handlers/DevOpsHandler.js';
import { QAHandler } from './handlers/QAHandler.js';
import { SecurityHandler } from './handlers/SecurityHandler.js';
import { DataEngineerHandler } from './handlers/DataEngineerHandler.js';
import { PerformanceHandler } from './handlers/PerformanceHandler.js';
import { DocumentationHandler } from './handlers/DocumentationHandler.js';
import { ProductManagerHandler } from './handlers/ProductManagerHandler.js';
import { SolutionsArchitectHandler } from './handlers/SolutionsArchitectHandler.js';
import { TechLeadHandler } from './handlers/TechLeadHandler.js';

const roleToQueue: Record<string, string> = {
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

export class AgentSupervisor {
  private static instance: AgentSupervisor;
  private registry: AgentRegistry;
  private handlers = new Map<AgentRoleType, AgentHandler>();
  private activeAgents = new Set<AgentRoleType>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private consumptionMode: ConsumptionModeKey = 'STANDARD';

  private constructor() {
    this.registry = new AgentRegistry();
  }

  static getInstance(): AgentSupervisor {
    if (!AgentSupervisor.instance) {
      AgentSupervisor.instance = new AgentSupervisor();
    }
    return AgentSupervisor.instance;
  }

  async initialize(): Promise<void> {
    // Load agent configs from plugins
    await this.registry.loadAll();

    // Create handler instances
    this.registerHandler(new MasterOrchestratorHandler());
    this.registerHandler(new BackendDevHandler());
    this.registerHandler(new FrontendDevHandler());
    this.registerHandler(new DevOpsHandler());
    this.registerHandler(new QAHandler());
    this.registerHandler(new SecurityHandler());
    this.registerHandler(new DataEngineerHandler());
    this.registerHandler(new PerformanceHandler());
    this.registerHandler(new DocumentationHandler());
    this.registerHandler(new ProductManagerHandler());
    this.registerHandler(new SolutionsArchitectHandler());
    this.registerHandler(new TechLeadHandler());

    // Load consumption mode from DB
    const prisma = getPrisma();
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'consumption_mode' },
    });
    if (setting) {
      this.consumptionMode = (setting.value as string) as ConsumptionModeKey;
    }

    // Start consumers based on consumption mode
    await this.startConsumers();

    // Start heartbeat monitoring
    this.startHeartbeatMonitor();

    registerShutdownHandler(async () => {
      this.stopHeartbeatMonitor();
      logger.info('AgentSupervisor shut down');
    });

    logger.info(`AgentSupervisor initialized with mode: ${this.consumptionMode}`);
  }

  private registerHandler(handler: AgentHandler): void {
    this.handlers.set(handler.role, handler);
  }

  private async startConsumers(): Promise<void> {
    const rmq = RabbitMQManager.getInstance();
    const modeConfig = getConsumptionMode(this.consumptionMode);
    const maxAgents = modeConfig.maxConcurrentAgents;

    // Always start Master
    const masterQueue = roleToQueue.MASTER_ORCHESTRATOR;
    if (masterQueue) {
      await rmq.consume(masterQueue, async (msg) => {
        const handler = this.handlers.get('MASTER_ORCHESTRATOR');
        if (!handler) return;
        const result = await handler.process(msg);
        await this.handleResult('MASTER_ORCHESTRATOR', msg, result);
      });
      this.activeAgents.add('MASTER_ORCHESTRATOR');
    }

    // Start other agents up to the consumption mode limit
    let startedCount = 1; // Master counts as 1
    for (const role of AGENT_ROLES) {
      if (role === 'MASTER_ORCHESTRATOR') continue;
      if (startedCount >= maxAgents) break;

      const queue = roleToQueue[role];
      const handler = this.handlers.get(role);
      if (!queue || !handler) continue;

      await rmq.consume(queue, async (msg) => {
        const result = await handler.process(msg);
        await this.handleResult(role, msg, result);
      });
      this.activeAgents.add(role);
      startedCount++;
    }

    // Start results consumer (Master processes all results)
    await rmq.consume(RABBITMQ_QUEUES.RESULTS, async (msg) => {
      const content = JSON.parse(msg.content.toString());
      logger.info('Result received', {
        taskId: content.taskId,
        success: content.success,
      });
      // Update task status in DB
      const prisma = getPrisma();
      await prisma.task.update({
        where: { id: content.taskId },
        data: {
          status: content.success ? 'COMPLETED' : 'FAILED',
          output: content.output || undefined,
          errorMessage: content.error || undefined,
          completedAt: content.success ? new Date() : undefined,
        },
      });
    });

    logger.info(`Started ${this.activeAgents.size} agent consumers`);
  }

  private async handleResult(
    role: AgentRoleType,
    msg: import('amqplib').ConsumeMessage,
    result: AgentResult,
  ): Promise<void> {
    const content = JSON.parse(msg.content.toString()) as TaskMessage;
    const rmq = RabbitMQManager.getInstance();

    // Publish result to results exchange
    await rmq.publish(RABBITMQ_EXCHANGES.RESULTS, `result.${content.taskId}.${result.success ? 'success' : 'failure'}`, {
      taskId: content.taskId,
      projectId: content.projectId,
      agentRole: role,
      ...result,
      correlationId: content.correlationId,
    }, { correlationId: content.correlationId });

    // Update agent status
    const redis = getRedis();
    await redis.hset(`agent:status:${role}`, {
      lastTask: content.taskId,
      lastResult: result.success ? 'success' : 'failure',
      updatedAt: new Date().toISOString(),
    });
  }

  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = setInterval(async () => {
      const redis = getRedis();
      const prisma = getPrisma();

      for (const role of this.activeAgents) {
        await redis.set(`agent:heartbeat:${role}`, Date.now().toString(), 'EX', Math.ceil(HEARTBEAT_TIMEOUT_MS / 1000));

        await prisma.agent.update({
          where: { role },
          data: { lastHeartbeat: new Date(), status: 'IDLE' },
        }).catch(() => {
          // Agent might not exist in DB yet
        });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeatMonitor(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async setConsumptionMode(mode: ConsumptionModeKey): Promise<void> {
    this.consumptionMode = mode;
    const prisma = getPrisma();
    await prisma.systemSetting.upsert({
      where: { key: 'consumption_mode' },
      update: { value: mode },
      create: { key: 'consumption_mode', value: mode, category: 'system' },
    });
    logger.info(`Consumption mode changed to: ${mode}`);
    // In a production system, you'd restart consumers here
  }

  getActiveAgents(): AgentRoleType[] {
    return Array.from(this.activeAgents);
  }

  getConsumptionMode(): ConsumptionModeKey {
    return this.consumptionMode;
  }

  getRegistry(): AgentRegistry {
    return this.registry;
  }
}
