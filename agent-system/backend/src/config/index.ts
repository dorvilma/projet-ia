import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RABBITMQ_URL: z.string().default('amqp://guest:guest@localhost:5672'),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  N8N_BASE_URL: z.string().default('http://localhost:5678'),
  SLACK_WEBHOOK_URL: z.string().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  DATADOG_API_KEY: z.string().optional(),
  DATADOG_APP_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    console.error('Invalid environment variables:', formatted);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
