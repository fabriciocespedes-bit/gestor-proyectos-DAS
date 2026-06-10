import {
  computeSchedule,
  generateTimeboxes,
  bandFor,
  type SchedTask,
} from '@projectos/core';
import { PrismaService } from '../common/prisma.service';

/**
 * Implementación de las herramientas que el modelo puede invocar (function-calling).
 * Todas operan bajo el contexto RLS del usuario → la IA nunca ve otro tenant.
 */
export class AiTools {
  constructor(private readonly prisma: PrismaService) {}

  /** Esquema de tools en formato OpenAI. */
  static schema() {
    return [
      tool('get_overdue', 'Tareas y proyectos atrasados', {}),
      tool('get_today_tasks', 'Qué hacer hoy: tareas del usuario por prioridad', {
        userId: { type: 'string' },
      }),
      tool('get_project_risk', 'Riesgo (0-100) de un proyecto con sus drivers', {
        projectId: { type: 'string' },
      }),
      tool('find_bottlenecks', 'Cuellos de botella: camino crítico + sobrecarga', {
        projectId: { type: 'string' },
      }),
      tool('plan_week', 'Propone timeboxes de la semana para el usuario', {
        userId: { type: 'string' },
      }),
    ];
  }

  async run(name: string, args: any) {
    switch (name) {
      case 'get_overdue':
        return this.getOverdue();
      case 'get_today_tasks':
        return this.getToday(args.userId);
      case 'get_project_risk':
        return this.getRisk(args.projectId);
      case 'find_bottlenecks':
        return this.findBottlenecks(args.projectId);
      case 'plan_week':
        return this.planWeek(args.userId);
      default:
        return { error: `tool desconocida: ${name}` };
    }
  }

  private async getOverdue() {
    const now = new Date();
    const tasks = await this.prisma.db.task.findMany({
      where: { dueDate: { lt: now }, status: { notIn: ['DONE'] }, deletedAt: null },
      select: { id: true, title: true, dueDate: true, priorityScore: true },
      orderBy: { priorityScore: 'desc' },
      take: 20,
    });
    return { count: tasks.length, tasks };
  }

  private async getToday(userId: string) {
    const tasks = await this.prisma.db.task.findMany({
      where: {
        assigneeId: userId,
        status: { in: ['TODAY', 'IN_PROGRESS', 'THIS_WEEK'] },
        deletedAt: null,
      },
      orderBy: { priorityScore: 'desc' },
      take: 10,
      select: { id: true, title: true, priorityScore: true, estimatedHours: true },
    });
    return tasks.map((t) => ({ ...t, band: bandFor(t.priorityScore) }));
  }

  private async getRisk(projectId: string) {
    const tasks = await this.prisma.db.task.findMany({
      where: { projectId, deletedAt: null },
      select: { status: true, dueDate: true, estimatedHours: true, actualHours: true },
    });
    if (!tasks.length) return { projectId, risk: 0, drivers: [] };
    const now = new Date();
    const open = tasks.filter((t) => t.status !== 'DONE');
    const overdue = open.filter((t) => t.dueDate && t.dueDate < now).length;
    const blocked = tasks.filter((t) => t.status === 'BLOCKED').length;
    const est = tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
    const act = tasks.reduce((s, t) => s + t.actualHours, 0);
    const overrun = est > 0 ? Math.max(act / est - 1, 0) : 0;
    const risk = Math.round(
      100 *
        Math.min(
          0.4 * (overdue / tasks.length) +
            0.25 * (blocked / tasks.length) +
            0.25 * Math.min(overrun, 1) +
            0.1 * (open.length / tasks.length),
          1,
        ),
    );
    return {
      projectId,
      risk,
      drivers: [
        { factor: 'atrasadas', value: overdue },
        { factor: 'bloqueadas', value: blocked },
        { factor: 'sobre-ejecución', value: `${Math.round(overrun * 100)}%` },
      ],
    };
  }

  private async findBottlenecks(projectId: string) {
    const tasks = await this.prisma.db.task.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        title: true,
        estimatedHours: true,
        dependencies: { select: { blockingId: true } },
      },
    });
    const sched: SchedTask[] = tasks.map((t) => ({
      id: t.id,
      duration: t.estimatedHours ?? 8,
      deps: t.dependencies.map((d) => d.blockingId),
    }));
    const plan = computeSchedule(sched);
    const titleById = new Map(tasks.map((t) => [t.id, t.title]));
    return {
      criticalPath: plan.criticalPath.map((id) => titleById.get(id)),
      durationHours: plan.projectDuration,
    };
  }

  private async planWeek(userId: string) {
    const user = await this.prisma.db.user.findUniqueOrThrow({ where: { id: userId } });
    const tasks = await this.prisma.db.task.findMany({
      where: { assigneeId: userId, status: { notIn: ['DONE'] }, deletedAt: null },
      orderBy: { priorityScore: 'desc' },
      take: 8,
      select: { id: true, title: true, estimatedHours: true, dueDate: true },
    });
    const from = new Date();
    const busy: { start: Date; end: Date }[] = [];
    const plan = [];
    for (const t of tasks) {
      if (!t.estimatedHours) continue;
      const res = generateTimeboxes({
        taskId: t.id,
        userId,
        estimatedHours: t.estimatedHours,
        dueDate: t.dueDate ?? null,
        workingHours: user.workingHours as any,
        busy,
        from,
      });
      busy.push(...res.blocks.map((b) => ({ start: b.start, end: b.end })));
      plan.push({ task: t.title, blocks: res.blocks.length, overloaded: res.overloaded });
    }
    return plan;
  }
}

function tool(name: string, description: string, props: Record<string, any>) {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: { type: 'object', properties: props, required: Object.keys(props) },
    },
  };
}
