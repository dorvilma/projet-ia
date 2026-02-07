import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const AGENTS = [
  { role: 'MASTER_ORCHESTRATOR' as const, name: 'Orchestrator', description: 'Project conductor, decision maker, task router' },
  { role: 'BACKEND_DEV' as const, name: 'Backend Developer', description: 'API design, business logic, database optimization' },
  { role: 'FRONTEND_DEV' as const, name: 'Frontend Developer', description: 'UI/component development, state management, a11y' },
  { role: 'DEVOPS' as const, name: 'DevOps Engineer', description: 'Infrastructure, CI/CD, container orchestration' },
  { role: 'QA' as const, name: 'QA Engineer', description: 'Test planning, automated testing, bug documentation' },
  { role: 'SECURITY' as const, name: 'Security Engineer', description: 'Security review, dependency scanning, compliance' },
  { role: 'DATA_ENGINEER' as const, name: 'Data Engineer', description: 'Data pipelines, ETL, data quality monitoring' },
  { role: 'PERFORMANCE' as const, name: 'Performance Specialist', description: 'Performance analysis, optimization, load testing' },
  { role: 'DOCUMENTATION' as const, name: 'Documentation Writer', description: 'API docs, user guides, architecture docs' },
  { role: 'PRODUCT_MANAGER' as const, name: 'Product Manager', description: 'Requirements analysis, feature prioritization' },
  { role: 'SOLUTIONS_ARCHITECT' as const, name: 'Solutions Architect', description: 'System design, technology selection, scalability' },
  { role: 'TECH_LEAD' as const, name: 'Technical Lead', description: 'Code quality, best practices, technical decisions' },
];

const SYSTEM_SETTINGS = [
  { key: 'consumption_mode', value: 'STANDARD', category: 'system' },
  { key: 'max_concurrent_projects', value: 3, category: 'system' },
  { key: 'notification_channels', value: { slack: true, email: false }, category: 'notifications' },
  { key: 'auto_retry_enabled', value: true, category: 'agents' },
  { key: 'max_retry_attempts', value: 3, category: 'agents' },
  { key: 'heartbeat_interval_ms', value: 15000, category: 'agents' },
  { key: 'audit_retention_days', value: 2555, category: 'audit' },
];

async function main() {
  console.log('Seeding database...');

  // Create default admin user
  const passwordHash = await bcrypt.hash('admin123456', 12);
  await prisma.user.upsert({
    where: { email: 'admin@agent-system.local' },
    update: {},
    create: {
      email: 'admin@agent-system.local',
      passwordHash,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });
  console.log('Admin user created');

  // Create all agents
  for (const agent of AGENTS) {
    await prisma.agent.upsert({
      where: { role: agent.role },
      update: { name: agent.name, description: agent.description },
      create: {
        role: agent.role,
        name: agent.name,
        description: agent.description,
        status: 'IDLE',
      },
    });
  }
  console.log(`${AGENTS.length} agents created`);

  // Create system settings
  for (const setting of SYSTEM_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value as any, category: setting.category },
      create: { key: setting.key, value: setting.value as any, category: setting.category },
    });
  }
  console.log(`${SYSTEM_SETTINGS.length} system settings created`);

  // Create default integrations
  const integrations = [
    { pluginId: 'n8n', name: 'n8n Workflow Automation', type: 'N8N' as const },
    { pluginId: 'slack', name: 'Slack Notifications', type: 'SLACK' as const },
    { pluginId: 'github', name: 'GitHub Integration', type: 'GITHUB' as const },
    { pluginId: 'datadog', name: 'Datadog Monitoring', type: 'DATADOG' as const },
  ];
  for (const integ of integrations) {
    await prisma.integration.upsert({
      where: { pluginId: integ.pluginId },
      update: {},
      create: integ,
    });
  }
  console.log('Default integrations created');

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
