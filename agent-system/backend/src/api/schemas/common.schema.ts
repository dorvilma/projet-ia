import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().cuid(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  consumptionMode: z.enum(['MINIMAL', 'STANDARD', 'HIGH_PERFORMANCE']).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  consumptionMode: z.enum(['MINIMAL', 'STANDARD', 'HIGH_PERFORMANCE']).optional(),
});

export const createTaskSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  type: z.enum([
    'DEVELOPMENT', 'REVIEW', 'TESTING', 'DEPLOYMENT', 'DOCUMENTATION',
    'ARCHITECTURE', 'SECURITY_AUDIT', 'PERFORMANCE', 'DATA_ENGINEERING',
    'PRODUCT_MANAGEMENT', 'ORCHESTRATION',
  ]).optional(),
  parentTaskId: z.string().cuid().optional(),
  input: z.record(z.unknown()).optional(),
});

export const taskFilterSchema = z.object({
  projectId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'QUEUED', 'IN_PROGRESS', 'WAITING_FOR_REVIEW', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
});

export const createPromptSchema = z.object({
  agentRole: z.enum([
    'MASTER_ORCHESTRATOR', 'BACKEND_DEV', 'FRONTEND_DEV', 'DEVOPS', 'QA',
    'SECURITY', 'DATA_ENGINEER', 'PERFORMANCE', 'DOCUMENTATION',
    'PRODUCT_MANAGER', 'SOLUTIONS_ARCHITECT', 'TECH_LEAD',
  ]),
  name: z.string().min(1).max(200),
  content: z.string().min(1),
});

export const createRuleSchema = z.object({
  agentRole: z.enum([
    'MASTER_ORCHESTRATOR', 'BACKEND_DEV', 'FRONTEND_DEV', 'DEVOPS', 'QA',
    'SECURITY', 'DATA_ENGINEER', 'PERFORMANCE', 'DOCUMENTATION',
    'PRODUCT_MANAGER', 'SOLUTIONS_ARCHITECT', 'TECH_LEAD',
  ]),
  name: z.string().min(1).max(200),
  conditions: z.record(z.unknown()),
  actions: z.record(z.unknown()),
  priority: z.number().int().optional(),
});

export const updateSettingSchema = z.object({
  value: z.unknown(),
});

export const createIntegrationSchema = z.object({
  pluginId: z.string().min(1),
  name: z.string().min(1).max(200),
  type: z.enum(['N8N', 'SLACK', 'GITHUB', 'DATADOG', 'CUSTOM_WEBHOOK']),
  config: z.record(z.unknown()).optional(),
});

export const updateIntegrationSchema = z.object({
  config: z.record(z.unknown()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CONFIGURING']).optional(),
});

export const webhookBodySchema = z.object({
  event: z.string().optional(),
  data: z.record(z.unknown()).optional(),
}).passthrough();
