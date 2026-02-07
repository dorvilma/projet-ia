import { logger } from './logger.js';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === opts.maxAttempts) break;

      const delay = Math.min(
        opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs,
      );
      const jitter = delay * 0.1 * Math.random();
      const totalDelay = Math.round(delay + jitter);

      logger.warn(`Retry ${attempt}/${opts.maxAttempts} for ${label} in ${totalDelay}ms`, {
        error: lastError.message,
      });

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError;
}
