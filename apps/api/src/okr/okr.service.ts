import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class OkrService {
  constructor(private readonly prisma: PrismaService) {}

  list(period?: string) {
    return this.prisma.db.objective.findMany({
      where: { period },
      include: {
        keyResults: {
          include: {
            _count: { select: { projects: true, tasks: true } },
          },
        },
      },
      orderBy: { period: 'desc' },
    });
  }

  createObjective(dto: { title: string; description?: string; period: string }) {
    return this.prisma.db.objective.create({
      data: {
        organizationId: this.prisma.orgId,
        title: dto.title,
        description: dto.description,
        period: dto.period,
      },
    });
  }

  createKeyResult(
    objectiveId: string,
    dto: { title: string; metric: string; unit?: string; startValue?: number; targetValue: number },
  ) {
    return this.prisma.db.keyResult.create({
      data: {
        organizationId: this.prisma.orgId,
        objectiveId,
        title: dto.title,
        metric: dto.metric,
        unit: dto.unit ?? '%',
        startValue: dto.startValue ?? 0,
        targetValue: dto.targetValue,
        currentValue: dto.startValue ?? 0,
      },
    });
  }

  /** Actualiza el valor actual de un KR y recalcula el progreso del objetivo. */
  async updateKeyResult(id: string, currentValue: number) {
    const kr = await this.prisma.db.keyResult.update({
      where: { id },
      data: { currentValue },
    });
    await this.recomputeObjectiveProgress(kr.objectiveId);
    return kr;
  }

  /** Vincula un proyecto o una tarea a un KR (jerarquía Obj→KR→Proyecto→Tarea). */
  async link(keyResultId: string, link: { projectId?: string; taskId?: string }) {
    return this.prisma.db.keyResult.update({
      where: { id: keyResultId },
      data: {
        projects: link.projectId ? { connect: { id: link.projectId } } : undefined,
        tasks: link.taskId ? { connect: { id: link.taskId } } : undefined,
      },
    });
  }

  /** Progreso del objetivo = media del avance normalizado de sus KRs (0–100). */
  private async recomputeObjectiveProgress(objectiveId: string) {
    const krs = await this.prisma.db.keyResult.findMany({
      where: { objectiveId },
      select: { startValue: true, targetValue: true, currentValue: true },
    });
    if (krs.length === 0) return;

    const avg =
      krs.reduce((sum, kr) => {
        const span = kr.targetValue - kr.startValue;
        const pct = span === 0 ? 1 : (kr.currentValue - kr.startValue) / span;
        return sum + Math.min(Math.max(pct, 0), 1);
      }, 0) / krs.length;

    await this.prisma.db.objective.update({
      where: { id: objectiveId },
      data: { progress: Math.round(avg * 100) },
    });
  }
}
