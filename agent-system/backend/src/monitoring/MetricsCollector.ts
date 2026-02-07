import { getPrisma } from '../storage/PrismaClient.js';
import { getRedis } from '../storage/RedisClient.js';
import { logger } from '../utils/logger.js';
import { AGENT_ROLES } from '../config/constants.js';

export interface SystemMetrics {
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  agents: {
    total: number;
    active: number;
    idle: number;
    error: number;
  };
  projects: {
    active: number;
  };
  performance: {
    avgTaskDurationMs: number;
    successRate: number;
    errorRate: number;
  };
}

export class MetricsCollector {
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const prisma = getPrisma();

    const [taskCounts, agentCounts, projectCount, completedTasks] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.agent.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.task.findMany({
        where: { status: 'COMPLETED', completedAt: { not: null }, startedAt: { not: null } },
        select: { startedAt: true, completedAt: true },
        take: 100,
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    const taskStatusMap: Record<string, number> = {};
    for (const t of taskCounts) {
      taskStatusMap[t.status] = t._count;
    }

    const agentStatusMap: Record<string, number> = {};
    for (const a of agentCounts) {
      agentStatusMap[a.status] = a._count;
    }

    const totalTasks = Object.values(taskStatusMap).reduce((a, b) => a + b, 0);
    const completed = taskStatusMap['COMPLETED'] || 0;
    const failed = taskStatusMap['FAILED'] || 0;

    // Compute average duration
    let avgDuration = 0;
    if (completedTasks.length > 0) {
      const durations = completedTasks
        .filter((t) => t.startedAt && t.completedAt)
        .map((t) => t.completedAt!.getTime() - t.startedAt!.getTime());
      if (durations.length > 0) {
        avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      }
    }

    return {
      tasks: {
        total: totalTasks,
        pending: taskStatusMap['PENDING'] || 0,
        inProgress: taskStatusMap['IN_PROGRESS'] || 0,
        completed,
        failed,
      },
      agents: {
        total: AGENT_ROLES.length,
        active: (agentStatusMap['BUSY'] || 0) + (agentStatusMap['IDLE'] || 0),
        idle: agentStatusMap['IDLE'] || 0,
        error: agentStatusMap['ERROR'] || 0,
      },
      projects: { active: projectCount },
      performance: {
        avgTaskDurationMs: Math.round(avgDuration),
        successRate: totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0,
        errorRate: totalTasks > 0 ? Math.round((failed / totalTasks) * 100) : 0,
      },
    };
  }

  async recordSnapshot(metricName: string, value: number, projectId?: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.metricSnapshot.create({
      data: {
        metricName,
        value,
        projectId,
      },
    });
  }
}

export const metricsCollector = new MetricsCollector();
