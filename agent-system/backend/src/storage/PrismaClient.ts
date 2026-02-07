import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { registerShutdownHandler } from '../utils/gracefulShutdown.js';

let prisma: PrismaClient;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        config.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'event', level: 'warn' },
              { emit: 'event', level: 'error' },
            ]
          : [
              { emit: 'event', level: 'warn' },
              { emit: 'event', level: 'error' },
            ],
    });

    prisma.$on('warn' as never, (e: { message: string }) => {
      logger.warn('Prisma warning', { message: e.message });
    });

    prisma.$on('error' as never, (e: { message: string }) => {
      logger.error('Prisma error', { message: e.message });
    });

    registerShutdownHandler(async () => {
      logger.info('Disconnecting Prisma...');
      await prisma.$disconnect();
    });
  }
  return prisma;
}
