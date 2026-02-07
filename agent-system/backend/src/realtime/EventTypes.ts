export const WS_EVENTS = {
  // Task events
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_DELEGATED: 'task.delegated',
  TASK_COMPLETED: 'task.completed',
  TASK_FAILED: 'task.failed',

  // Agent events
  AGENT_STATUS_CHANGED: 'agent.status_changed',
  AGENT_HEARTBEAT: 'agent.heartbeat',
  AGENT_OFFLINE: 'agent.offline',

  // Metric events
  METRIC_SNAPSHOT: 'metric.snapshot',

  // Log events
  LOG_ENTRY: 'log.entry',

  // Alert events
  ALERT_TRIGGERED: 'alert.triggered',
  ALERT_RESOLVED: 'alert.resolved',

  // System events
  SYSTEM_MODE_CHANGED: 'system.mode_changed',
} as const;

export type WsEventType = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

export interface WsMessage {
  type: WsEventType;
  data: unknown;
  timestamp: string;
  correlationId?: string;
}
