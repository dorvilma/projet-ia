export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
  correlationId?: string;
}

export type TaskStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_REVIEW'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETRYING';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AgentStatus = 'IDLE' | 'BUSY' | 'OVERLOADED' | 'ERROR' | 'OFFLINE' | 'MAINTENANCE';

export type AgentRole =
  | 'MASTER_ORCHESTRATOR'
  | 'BACKEND_DEV'
  | 'FRONTEND_DEV'
  | 'DEVOPS'
  | 'QA'
  | 'SECURITY'
  | 'DATA_ENGINEER'
  | 'PERFORMANCE'
  | 'DOCUMENTATION'
  | 'PRODUCT_MANAGER'
  | 'SOLUTIONS_ARCHITECT'
  | 'TECH_LEAD';

export type ConsumptionMode = 'MINIMAL' | 'STANDARD' | 'HIGH_PERFORMANCE';

export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  consumptionMode: ConsumptionMode;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number; agentAssignments: number };
}

export interface Task {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  errorMessage: string | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks?: Task[];
  agentAssignment?: { agent: Agent } | null;
}

export interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  description: string | null;
  status: AgentStatus;
  config: Record<string, unknown>;
  capabilities: string[];
  lastHeartbeat: string | null;
  currentLoad: number;
  maxLoad: number;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  correlationId: string | null;
  userId: string | null;
  agentId: string | null;
  taskId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  status: string;
  message: string | null;
  triggeredAt: string;
  resolvedAt: string | null;
}

export interface CostSummary {
  totalCost: number;
  breakdown: Record<string, number>;
  trend: Array<{ date: string; amount: number }>;
}

export interface Integration {
  id: string;
  pluginId: string;
  name: string;
  type: string;
  status: string;
  lastSyncAt: string | null;
}
