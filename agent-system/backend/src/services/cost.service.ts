import { getPrisma } from '../storage/PrismaClient.js';

export interface CostBreakdown {
  totalCost: number;
  byCategory: Record<string, number>;
  byProject: Record<string, { name: string; cost: number }>;
  monthlyTrend: Array<{ month: string; amount: number }>;
}

export class CostService {
  private prisma = getPrisma();

  async getBreakdown(projectId?: string): Promise<CostBreakdown> {
    const where = projectId ? { projectId } : {};

    const records = await this.prisma.costRecord.findMany({
      where,
      include: { project: { select: { name: true } } },
      orderBy: { recordedAt: 'desc' },
    });

    const byCategory: Record<string, number> = {};
    const byProject: Record<string, { name: string; cost: number }> = {};
    let totalCost = 0;

    for (const record of records) {
      const amount = Number(record.amount);
      totalCost += amount;

      byCategory[record.category] = (byCategory[record.category] || 0) + amount;

      if (!byProject[record.projectId]) {
        byProject[record.projectId] = { name: record.project.name, cost: 0 };
      }
      byProject[record.projectId].cost += amount;
    }

    // Monthly trend (last 6 months)
    const monthlyTrend: Array<{ month: string; amount: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthRecords = records.filter(
        (r) => r.recordedAt >= date && r.recordedAt <= monthEnd,
      );
      const amount = monthRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      monthlyTrend.push({
        month: date.toISOString().slice(0, 7),
        amount: Math.round(amount * 100) / 100,
      });
    }

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      byCategory,
      byProject,
      monthlyTrend,
    };
  }

  async recordCost(
    projectId: string,
    category: string,
    amount: number,
    description?: string,
  ): Promise<void> {
    await this.prisma.costRecord.create({
      data: { projectId, category, amount, description },
    });
  }
}

export const costService = new CostService();
