/**
 * MÓDULO 4 — Gantt: planificación por dependencias, camino crítico (CPM)
 * y reprogramación automática (forward pass + backward pass).
 * Trabaja en "unidades de tiempo" abstractas (horas/días); el caller mapea a fechas.
 */

export interface SchedTask {
  id: string;
  duration: number; // en la misma unidad que el resultado
  /** ids de tareas predecesoras (Finish-to-Start) */
  deps: string[];
}

export interface ScheduledNode {
  id: string;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number; // holgura: 0 ⇒ está en el camino crítico
  critical: boolean;
}

export interface ScheduleResult {
  nodes: Record<string, ScheduledNode>;
  projectDuration: number;
  criticalPath: string[];
  hasCycle: boolean;
}

/** Orden topológico (Kahn). Devuelve null si hay ciclo (dependencia inválida). */
export function topoSort(tasks: SchedTask[]): string[] | null {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const t of tasks) {
    indeg.set(t.id, indeg.get(t.id) ?? 0);
    for (const dep of t.deps) {
      adj.set(dep, [...(adj.get(dep) ?? []), t.id]);
      indeg.set(t.id, (indeg.get(t.id) ?? 0) + 1);
    }
  }
  const queue = [...indeg.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      indeg.set(next, indeg.get(next)! - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  return order.length === tasks.length ? order : null;
}

export function computeSchedule(tasks: SchedTask[]): ScheduleResult {
  const order = topoSort(tasks);
  if (!order) {
    return {
      nodes: {},
      projectDuration: 0,
      criticalPath: [],
      hasCycle: true,
    };
  }

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const nodes: Record<string, ScheduledNode> = {};

  // Forward pass → earliest start/finish
  for (const id of order) {
    const t = byId.get(id)!;
    const es = t.deps.length
      ? Math.max(...t.deps.map((d) => nodes[d].earliestFinish))
      : 0;
    nodes[id] = {
      id,
      earliestStart: es,
      earliestFinish: es + t.duration,
      latestStart: 0,
      latestFinish: 0,
      slack: 0,
      critical: false,
    };
  }

  const projectDuration = Math.max(
    0,
    ...Object.values(nodes).map((n) => n.earliestFinish),
  );

  // Backward pass → latest start/finish
  const successors = new Map<string, string[]>();
  for (const t of tasks)
    for (const d of t.deps)
      successors.set(d, [...(successors.get(d) ?? []), t.id]);

  for (const id of [...order].reverse()) {
    const t = byId.get(id)!;
    const succ = successors.get(id) ?? [];
    const lf = succ.length
      ? Math.min(...succ.map((s) => nodes[s].latestStart))
      : projectDuration;
    nodes[id].latestFinish = lf;
    nodes[id].latestStart = lf - t.duration;
    nodes[id].slack = nodes[id].latestStart - nodes[id].earliestStart;
    nodes[id].critical = nodes[id].slack === 0;
  }

  const criticalPath = order.filter((id) => nodes[id].critical);

  return { nodes, projectDuration, criticalPath, hasCycle: false };
}

/** Detecta si añadir una dependencia crearía un ciclo (para validar drag&drop). */
export function wouldCreateCycle(
  tasks: SchedTask[],
  dependentId: string,
  newDepId: string,
): boolean {
  const candidate = tasks.map((t) =>
    t.id === dependentId ? { ...t, deps: [...t.deps, newDepId] } : t,
  );
  return topoSort(candidate) === null;
}
