import { logger } from './logger.js';

type ShutdownHandler = () => Promise<void>;

const handlers: ShutdownHandler[] = [];
let isShuttingDown = false;

export function registerShutdownHandler(handler: ShutdownHandler) {
  handlers.push(handler);
}

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  for (const handler of handlers.reverse()) {
    try {
      await handler();
    } catch (err) {
      logger.error('Error during shutdown handler', { error: err });
    }
  }

  logger.info('Graceful shutdown complete.');
  process.exit(0);
}

export function setupGracefulShutdown() {
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });
}
