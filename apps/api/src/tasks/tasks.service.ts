import { Injectable } from '@nestjs/common';
import {
  computePriorityScore,
  computeUrgency,
  bandFor,
} from '@projectos/core';
import { PrismaService } from '../common/prisma.service';

export interface CreateTaskDto {
  projectId: string;
  columnId?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
  impact?: number;
  strategicValue?: number;
  riskFactor?: number;
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea una tarea con número secuencial por proyecto y score inicial. */
  async create(dto: CreateTaskDto) {
    return this.prisma.tx(async (tx) => {
      const last = await tx.task.findFirst({
        where: { projectId: dto.projectId },
        orderBy: { number: 'desc' },
        select: { number: true },
      });
      const number = (last?.number ?? 0) + 1;

      const impact = dto.impact ?? 3;
      const strategicValue = dto.strategicValue ?? 3;
      const riskFactor = dto.riskFactor ?? 2;
      const due = dto.dueDate ? new Date(dto.dueDate) : null;
      const score = computePriorityScore({
        impact,
        urgency: due ? computeUrgency(due, new Date()) : 3,
        strategicValue,
        riskFactor,
        blockingCount: 0,
      });

      return tx.task.create({
        data: {
          organizationId: this.prisma.orgId,
          projectId: dto.projectId,
          columnId: dto.columnId,
          number,
          title: dto.title,
          description: dto.description,
          assigneeId: dto.assigneeId,
          reporterId: this.prisma.userId,
          dueDate: due ?? undefined,
          estimatedHours: dto.estimatedHours,
          impact,
          strategicValue,
          riskFactor,
          priorityScore: score,
          status: 'TODO',
        },
      });
    });
  }

  /** Recalcula y persiste el priorityScore de una tarea. Idempotente. */
  async recomputePriority(taskId: string, now = new Date()) {
    const task = await this.prisma.db.task.findUniqueOrThrow({
      where: { id: taskId },
      include: { _count: { select: { dependents: true } } },
    });

    // urgencia: si hay due date la derivamos; si no, usamos el campo manual.
    const urgency = task.dueDate
      ? computeUrgency(task.dueDate, now)
      : task.urgency;

    const score = computePriorityScore({
      impact: task.impact,
      urgency,
      strategicValue: task.strategicValue,
      riskFactor: task.riskFactor,
      blockingCount: task._count.dependents,
    });

    await this.prisma.db.task.update({
      where: { id: taskId },
      data: { priorityScore: score },
    });

    return { taskId, priorityScore: score, band: bandFor(score) };
  }

  /** Mueve una tarjeta (drag&drop) con orden fraccional estable. */
  async move(taskId: string, columnId: string, order: number, status: any) {
    const task = await this.prisma.db.task.update({
      where: { id: taskId },
      data: { columnId, order, status },
    });
    // recálculo asíncrono se dispara vía evento en producción; aquí inline para demo
    await this.recomputePriority(taskId);
    return task;
  }

  /** "Qué hacer hoy": tareas del usuario ordenadas por score, top N. */
  async todayFor(userId: string, limit = 10) {
    return this.prisma.db.task.findMany({
      where: {
        assigneeId: userId,
        status: { in: ['TODAY', 'IN_PROGRESS', 'THIS_WEEK'] },
        deletedAt: null,
      },
      orderBy: { priorityScore: 'desc' },
      take: limit,
    });
  }
}
