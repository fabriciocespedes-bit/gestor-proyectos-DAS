import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const DAY = 86_400_000;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lead time (creación→done) y cycle time (inicio→done) medios, en horas.
   * Nota: cycle usa startDate cuando existe; si no, cae a createdAt.
   */
  async cycleTime(projectId: string) {
    const done = await this.prisma.db.task.findMany({
      where: { projectId, status: 'DONE', deletedAt: null },
      select: { createdAt: true, startDate: true, updatedAt: true },
    });
    if (done.length === 0) return { lead: 0, cycle: 0, count: 0 };

    const lead = avg(done.map((t) => (t.updatedAt.getTime() - t.createdAt.getTime()) / 3.6e6));
    const cycle = avg(
      done.map((t) => {
        const start = (t.startDate ?? t.createdAt).getTime();
        return (t.updatedAt.getTime() - start) / 3.6e6;
      }),
    );
    return { lead: round(lead), cycle: round(cycle), count: done.length, unit: 'h' };
  }

  /** Velocity: horas estimadas completadas por semana (últimas N semanas). */
  async velocity(projectId: string, weeks = 6) {
    const since = new Date(Date.now() - weeks * 7 * DAY);
    const done = await this.prisma.db.task.findMany({
      where: { projectId, status: 'DONE', updatedAt: { gte: since }, deletedAt: null },
      select: { updatedAt: true, estimatedHours: true },
    });
    const buckets = new Map<string, number>();
    for (const t of done) {
      const wk = isoWeek(t.updatedAt);
      buckets.set(wk, (buckets.get(wk) ?? 0) + (t.estimatedHours ?? 0));
    }
    return [...buckets.entries()]
      .map(([week, hours]) => ({ week, hours: round(hours) }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  /**
   * Burndown: horas restantes (estimadas de tareas no DONE) vs. línea ideal,
   * proyectado entre startDate y dueDate del proyecto.
   */
  async burndown(projectId: string) {
    const project = await this.prisma.db.project.findFirstOrThrow({
      where: { id: projectId },
      select: { startDate: true, dueDate: true },
    });
    const tasks = await this.prisma.db.task.findMany({
      where: { projectId, deletedAt: null },
      select: { status: true, estimatedHours: true, updatedAt: true },
    });
    const total = tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
    const remaining = tasks
      .filter((t) => t.status !== 'DONE')
      .reduce((s, t) => s + (t.estimatedHours ?? 0), 0);

    const start = project.startDate ?? new Date();
    const end = project.dueDate ?? new Date(Date.now() + 14 * DAY);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY));

    const ideal = Array.from({ length: days + 1 }, (_, i) => ({
      day: i,
      hours: round(total * (1 - i / days)),
    }));
    return { total: round(total), remaining: round(remaining), ideal };
  }

  /** Uso de capacidad por persona en una ventana (horas asignadas vs. disponibles). */
  async capacityUsage(from: Date, to: Date) {
    const weeks = Math.max((to.getTime() - from.getTime()) / (7 * DAY), 0);
    const people = await this.prisma.db.user.findMany({
      select: { id: true, name: true, weeklyHours: true },
    });
    const result = [];
    for (const p of people) {
      const tasks = await this.prisma.db.task.findMany({
        where: { assigneeId: p.id, dueDate: { gte: from, lte: to }, deletedAt: null },
        select: { estimatedHours: true },
      });
      const assigned = tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
      const available = p.weeklyHours * weeks;
      result.push({
        user: p.name,
        assigned: round(assigned),
        available: round(available),
        occupancyPct: available > 0 ? Math.round((assigned / available) * 100) : 0,
      });
    }
    return result;
  }
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round = (n: number) => Math.round(n * 10) / 10;
function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / DAY + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
