import { getPrisma } from '../storage/PrismaClient.js';
import { NotFoundError } from '../utils/errors.js';
import { buildPaginatedResult, buildPrismaArgs, type PaginationParams } from '../utils/pagination.js';

interface CreateProjectInput {
  name: string;
  description?: string;
  consumptionMode?: string;
}

export class ProjectService {
  private prisma = getPrisma();

  async create(data: CreateProjectInput, userId: string) {
    const project = await this.prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        consumptionMode: (data.consumptionMode as any) || 'STANDARD',
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'project.created',
        entityType: 'project',
        entityId: project.id,
        after: project as any,
      },
    });

    return project;
  }

  async findMany(params: PaginationParams) {
    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        ...buildPrismaArgs(params),
        include: {
          _count: { select: { tasks: true, agentAssignments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count(),
    ]);

    return buildPaginatedResult(data, total, params);
  }

  async findById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { tasks: true, agentAssignments: true } },
      },
    });
    if (!project) throw new NotFoundError('Project', id);
    return project;
  }

  async update(id: string, data: Partial<CreateProjectInput> & { status?: string }) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundError('Project', id);

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status as any }),
        ...(data.consumptionMode && { consumptionMode: data.consumptionMode as any }),
      },
    });
  }

  async delete(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundError('Project', id);

    return this.prisma.project.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
  }
}

export const projectService = new ProjectService();
