import { CONSUMPTION_MODES } from './constants.js';

export type ConsumptionModeKey = keyof typeof CONSUMPTION_MODES;

export interface ConsumptionModeConfig {
  maxConcurrentAgents: number;
  maxParallelTasks: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  workerPoolSize: number;
}

export function getConsumptionMode(mode: ConsumptionModeKey): ConsumptionModeConfig {
  return CONSUMPTION_MODES[mode];
}
