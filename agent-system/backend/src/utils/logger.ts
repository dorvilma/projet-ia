import winston from 'winston';
import { config } from '../config/index.js';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const cid = correlationId ? `[${correlationId}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${cid}${message}${metaStr}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: config.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'agent-system' },
  transports: [new winston.transports.Console()],
});

export function createChildLogger(meta: Record<string, string>) {
  return logger.child(meta);
}
