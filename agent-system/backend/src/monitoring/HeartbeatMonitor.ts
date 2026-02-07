import { getRedis } from '../storage/RedisClient.js';
import { getPrisma } from '../storage/PrismaClient.js';
import { AGENT_ROLES, HEARTBEAT_TIMEOUT_MS } from '../config/constants.js';
import { WebSocketServer } from '../realtime/WebSocketServer.js';
import { WS_EVENTS } from '../realtime/EventTypes.js';
import { logger } from '../utils/logger.js';

export class HeartbeatMonitor {
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  start(intervalMs = 30_000): void {
    this.checkInterval = setInterval(() => this.checkHeartbeats(), intervalMs);
    logger.info('Heartbeat monitor started');
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkHeartbeats(): Promise<void> {
    const redis = getRedis();
    const prisma = getPrisma();

    for (const role of AGENT_ROLES) {
      const heartbeat = await redis.get(`agent:heartbeat:${role}`);

      if (!heartbeat) {
        // No heartbeat found - agent may be offline
        const agent = await prisma.agent.findUnique({ where: { role } });
        if (agent && agent.status !== 'OFFLINE' && agent.status !== 'MAINTENANCE') {
          await prisma.agent.update({
            where: { role },
            data: { status: 'OFFLINE' },
          });

          WebSocketServer.getInstance().broadcast(WS_EVENTS.AGENT_OFFLINE, {
            role,
            name: agent.name,
          });

          logger.warn(`Agent ${role} is offline (no heartbeat)`);
        }
        continue;
      }

      const lastBeat = parseInt(heartbeat, 10);
      const elapsed = Date.now() - lastBeat;

      if (elapsed > HEARTBEAT_TIMEOUT_MS) {
        await prisma.agent.update({
          where: { role },
          data: { status: 'ERROR' },
        });
        logger.warn(`Agent ${role} heartbeat timeout (${elapsed}ms)`);
      }
    }
  }
}

export const heartbeatMonitor = new HeartbeatMonitor();
