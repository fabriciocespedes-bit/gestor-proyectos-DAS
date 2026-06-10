import { BadRequestException, Injectable } from '@nestjs/common';
import { computeSchedule, wouldCreateCycle, type SchedTask } from '@projectos/core';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class GanttService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plan del proyecto: ejecuta CPM (scheduling.ts) sobre las tareas y sus
   * dependencias, y proyecta las unidades (horas) a fechas desde startDate.
   */
  async gantt(projectId: string) {
    const tasks = await this.prisma.db.task.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        title: true,
        estimatedHours: true,
        dependencies: { select: { blockingId: true } }, // predecesoras
      },
    });

    const sched: SchedTask[] = tasks.map((t) => ({
      id: t.id,
      duration: t.estimatedHours ?? 8, // 1 día por defecto si no hay estimación
      deps: t.dependencies.map((d) => d.blockingId),
    }));

    const result = computeSchedule(sched);
    if (result.hasCycle) {
      throw new BadRequestException('El grafo de dependencias tiene un ciclo');
    }

    const project = await this.prisma.db.project.findFirst({
      where: { id: projectId },
      select: { startDate: true },
    });
    const origin = project?.startDate ?? new Date();

    // Proyecta horas-laborables a fechas (8h/día laborable, lun-vie).
    const toDate = (hours: number) => addWorkingHours(origin, hours);
    const titleById = new Map(tasks.map((t) => [t.id, t.title]));

    return {
      projectId,
      projectDurationHours: result.projectDuration,
      criticalPath: result.criticalPath.map((id) => ({ id, title: titleById.get(id) })),
      bars: Object.values(result.nodes).map((n) => ({
        id: n.id,
        title: titleById.get(n.id),
        start: toDate(n.earliestStart),
        end: toDate(n.earliestFinish),
        slackHours: n.slack,
        critical: n.critical,
      })),
    };
  }

  /** Añade dependencia (Finish-to-Start por defecto); rechaza si crea ciclo. */
  async addDependency(dependentId: string, blockingId: string, type = 'FINISH_TO_START') {
    if (dependentId === blockingId) {
      throw new BadRequestException('Una tarea no puede depender de sí misma');
    }
    const dep = await this.prisma.db.task.findUniqueOrThrow({
      where: { id: dependentId },
      select: { projectId: true, organizationId: true },
    });
    const tasks = await this.prisma.db.task.findMany({
      where: { projectId: dep.projectId, deletedAt: null },
      select: { id: true, dependencies: { select: { blockingId: true } } },
    });
    const sched: SchedTask[] = tasks.map((t) => ({
      id: t.id,
      duration: 1,
      deps: t.dependencies.map((d) => d.blockingId),
    }));
    if (wouldCreateCycle(sched, dependentId, blockingId)) {
      throw new BadRequestException('La dependencia crearía un ciclo');
    }
    return this.prisma.db.dependency.create({
      data: {
        organizationId: dep.organizationId,
        dependentId,
        blockingId,
        type: type as any,
      },
    });
  }

  removeDependency(dependentId: string, blockingId: string) {
    return this.prisma.db.dependency.delete({
      where: { dependentId_blockingId: { dependentId, blockingId } },
    });
  }
}

/** Suma `hours` de trabajo (8h/día, lun-vie) a una fecha. */
function addWorkingHours(from: Date, hours: number): Date {
  const d = new Date(from);
  let remaining = hours;
  while (remaining > 0) {
    const day = d.getDay();
    if (day === 0 || day === 6) {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      continue;
    }
    const chunk = Math.min(8, remaining);
    d.setHours(d.getHours() + chunk);
    remaining -= chunk;
    if (remaining > 0) {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    }
  }
  return d;
}
