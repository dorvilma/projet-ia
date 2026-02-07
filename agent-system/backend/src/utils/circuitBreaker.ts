// @ts-expect-error no types for opossum
import CircuitBreaker from 'opossum';
import { logger } from './logger.js';

const DEFAULT_OPTIONS: CircuitBreaker.Options = {
  timeout: 10_000,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
  volumeThreshold: 5,
};

export function createBreaker<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  name: string,
  options?: Partial<CircuitBreaker.Options>,
  fallback?: (...args: TArgs) => TResult,
): CircuitBreaker<TArgs, TResult> {
  const breaker = new CircuitBreaker(fn, { ...DEFAULT_OPTIONS, ...options, name });

  if (fallback) {
    breaker.fallback(fallback);
  }

  breaker.on('open', () => logger.warn(`Circuit OPEN: ${name}`));
  breaker.on('halfOpen', () => logger.info(`Circuit HALF-OPEN: ${name}`));
  breaker.on('close', () => logger.info(`Circuit CLOSED: ${name}`));
  breaker.on('timeout', () => logger.warn(`Circuit TIMEOUT: ${name}`));
  breaker.on('reject', () => logger.warn(`Circuit REJECTED: ${name}`));

  return breaker;
}
