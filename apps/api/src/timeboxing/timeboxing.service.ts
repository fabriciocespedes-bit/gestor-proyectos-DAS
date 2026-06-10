import { Injectable, NotFoundException } from '@nestjs/common';
import {
  generateTimeboxes,
  computeCapacity,
  type ProposedBlock,
} from '@projectos/core';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class TimeboxingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera bloques propuestos para una tarea, respetando la agenda real del
   * asignado (otros timeboxes) y su horario laboral. No persiste hasta confirmar.
   */
  async generate(taskId: string, from: Date, maxBlockHours = 2) {
    const task = await this.prisma.db.task.findUnique({
      where: { id: taskId },
      include: { assignee: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (!task.assignee || !task.estimatedHours)
      return { blocks: [], overloaded: false, reason: 'missing_assignee_or_estimate' };

    const horizonEnd = new Date(from);
    horizonEnd.setDate(horizonEnd.getDate() + 30);

    const busy = await this.prisma.db.timeBlock.findMany({
      where: {
        userId: task.assigneeId!,
        start: { gte: from },
        end: { lte: horizonEnd },
      },
      select: { start: true, end: true },
    });

    const result = generateTimeboxes({
      taskId: task.id,
      userId: task.assigneeId!,
      estimatedHours: task.estimatedHours,
      dueDate: task.dueDate ?? null,
      workingHours: task.assignee.workingHours as any,
      busy,
      from,
      maxBlockHours,
    });

    return result; // { blocks, scheduledHours, unscheduledHours, overloaded, missesDueDate }
  }

  /** Persiste bloques confirmados (origen AUTO) bajo un único contexto RLS. */
  async commit(taskId: string, blocks: ProposedBlock[]) {
    return this.prisma.tx(async (tx) => {
      const task = await tx.task.findUniqueOrThrow({
        where: { id: taskId },
        select: { organizationId: true },
      });
      return Promise.all(
        blocks.map((b) =>
          tx.timeBlock.create({
            data: {
              organizationId: task.organizationId,
              taskId,
              userId: b.userId,
              start: b.start,
              end: b.end,
              source: 'AUTO',
              status: 'PLANNED',
            },
          }),
        ),
      );
    });
  }

  /** Capacidad de una persona en una ventana (para alertas de sobrecarga). */
  async userCapacity(userId: string, from: Date, to: Date) {
    const user = await this.prisma.db.user.findUniqueOrThrow({ where: { id: userId } });
    const tasks = await this.prisma.db.task.findMany({
      where: { assigneeId: userId, dueDate: { gte: from, lte: to }, deletedAt: null },
      select: { estimatedHours: true },
    });
    const assignedHours = tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);

    return computeCapacity(
      {
        userId,
        weeklyHours: user.weeklyHours,
        workingHours: user.workingHours as any,
        assignedHours,
        reservedHours: 0,
      },
      from,
      to,
    );
  }
}
