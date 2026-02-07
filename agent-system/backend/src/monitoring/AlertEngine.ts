import { getPrisma } from '../storage/PrismaClient.js';
import { PluginRegistry } from '../plugins/PluginRegistry.js';
import { WebSocketServer } from '../realtime/WebSocketServer.js';
import { WS_EVENTS } from '../realtime/EventTypes.js';
import { logger } from '../utils/logger.js';
import { metricsCollector } from './MetricsCollector.js';

export interface AlertRule {
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq';
  threshold: number;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  cooldownMinutes: number;
}

const DEFAULT_RULES: AlertRule[] = [
  { name: 'High Error Rate', metric: 'errorRate', condition: 'gt', threshold: 10, severity: 'ERROR', cooldownMinutes: 15 },
  { name: 'Agent Errors', metric: 'agentErrors', condition: 'gt', threshold: 0, severity: 'WARNING', cooldownMinutes: 5 },
  { name: 'No Active Agents', metric: 'activeAgents', condition: 'eq', threshold: 0, severity: 'CRITICAL', cooldownMinutes: 1 },
];

export class AlertEngine {
  private lastTriggered = new Map<string, number>();

  async evaluate(): Promise<void> {
    const metrics = await metricsCollector.collectSystemMetrics();
    const metricValues: Record<string, number> = {
      errorRate: metrics.performance.errorRate,
      agentErrors: metrics.agents.error,
      activeAgents: metrics.agents.active,
      pendingTasks: metrics.tasks.pending,
      avgDuration: metrics.performance.avgTaskDurationMs,
    };

    for (const rule of DEFAULT_RULES) {
      const value = metricValues[rule.metric];
      if (value === undefined) continue;

      const triggered = this.evaluateCondition(value, rule.condition, rule.threshold);
      if (!triggered) continue;

      // Check cooldown
      const lastTime = this.lastTriggered.get(rule.name) || 0;
      if (Date.now() - lastTime < rule.cooldownMinutes * 60_000) continue;

      this.lastTriggered.set(rule.name, Date.now());

      const prisma = getPrisma();
      const alert = await prisma.alert.create({
        data: {
          name: rule.name,
          severity: rule.severity,
          message: `${rule.metric} is ${value} (threshold: ${rule.threshold})`,
          condition: rule as any,
          metadata: { currentValue: value },
        },
      });

      // Broadcast to WebSocket
      WebSocketServer.getInstance().broadcast(WS_EVENTS.ALERT_TRIGGERED, alert);

      // Notify via Slack if configured
      const pluginRegistry = PluginRegistry.getInstance();
      await pluginRegistry.execute('slack', 'alert', {
        severity: rule.severity,
        message: `[${rule.name}] ${rule.metric} = ${value} (threshold: ${rule.threshold})`,
      }).catch(() => {});

      logger.warn(`Alert triggered: ${rule.name}`, { severity: rule.severity, value });
    }
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }
}

export const alertEngine = new AlertEngine();
