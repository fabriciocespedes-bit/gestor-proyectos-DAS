import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const DEFAULT_COLUMNS = [
  'Backlog',
  'Pendiente',
  'Esta semana',
  'Hoy',
  'En progreso',
  'Bloqueado',
  'En revisión',
  'Terminado',
];

export interface CreateProjectDto {
  key: string;
  name: string;
  description?: string;
  goal?: string;
  teamId?: string;
  sponsorId?: string;
  ownerId?: string;
  startDate?: string;
  dueDate?: string;
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(filter: { status?: string; priority?: string; teamId?: string } = {}) {
    return this.prisma.db.project.findMany({
      where: {
        deletedAt: null,
        status: filter.status as any,
        priority: filter.priority as any,
        teamId: filter.teamId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateProjectDto) {
    return this.prisma.tx(async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId: this.prisma.orgId,
          key: dto.key.toUpperCase(),
          name: dto.name,
          description: dto.description,
          goal: dto.goal,
          teamId: dto.teamId,
          sponsorId: dto.sponsorId,
          ownerId: dto.ownerId ?? this.prisma.userId,
          priority: dto.priority ?? 'MEDIUM',
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: 'PLANNING',
        },
      });
      // Columnas Kanban por defecto.
      await tx.boardColumn.createMany({
        data: DEFAULT_COLUMNS.map((name, i) => ({
          organizationId: this.prisma.orgId,
          projectId: project.id,
          name,
          order: i,
          wipLimit: name === 'Hoy' || name === 'En progreso' ? 3 : null,
        })),
      });
      return project;
    });
  }

  async get(id: string) {
    const project = await this.prisma.db.project.findFirst({
      where: { id, deletedAt: null },
      include: { milestones: true, columns: { orderBy: { order: 'asc' } } },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    return project;
  }

  update(id: string, dto: Partial<CreateProjectDto> & { status?: string }) {
    return this.prisma.db.project.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        goal: dto.goal,
        priority: dto.priority as any,
        status: dto.status as any,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  remove(id: string) {
    return this.prisma.db.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Tablero: columnas con sus tareas ordenadas por posición fraccional. */
  async board(id: string) {
    const columns = await this.prisma.db.boardColumn.findMany({
      where: { projectId: id },
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            assignee: { select: { id: true, name: true } },
            labels: { include: { label: true } },
            _count: { select: { checklist: true, comments: true, dependents: true } },
          },
        },
      },
    });
    return { projectId: id, columns };
  }

  /**
   * Riesgo del proyecto (0–100) — fórmula determinista (ver docs/09-IA.md):
   * %atrasadas, %bloqueadas, sobre-ejecución de horas, proximidad sin avance.
   */
  async computeRisk(id: string) {
    const tasks = await this.prisma.db.task.findMany({
      where: { projectId: id, deletedAt: null },
      select: {
        status: true,
        dueDate: true,
        estimatedHours: true,
        actualHours: true,
      },
    });
    if (tasks.length === 0) return this.persistRisk(id, 0);

    const now = new Date();
    const open = tasks.filter((t) => t.status !== 'DONE');
    const overdue = open.filter((t) => t.dueDate && t.dueDate < now).length;
    const blocked = tasks.filter((t) => t.status === 'BLOCKED').length;
    const est = tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
    const act = tasks.reduce((s, t) => s + t.actualHours, 0);
    const overrun = est > 0 ? Math.max(act / est - 1, 0) : 0;

    const risk =
      100 *
      Math.min(
        0.4 * (overdue / tasks.length) +
          0.25 * (blocked / tasks.length) +
          0.25 * Math.min(overrun, 1) +
          0.1 * (open.length / tasks.length),
        1,
      );
    return this.persistRisk(id, Math.round(risk));
  }

  private async persistRisk(id: string, riskScore: number) {
    const status = riskScore >= 60 ? 'AT_RISK' : undefined;
    await this.prisma.db.project.update({
      where: { id },
      data: { riskScore, ...(status ? { status } : {}) },
    });
    return { projectId: id, riskScore };
  }
}
