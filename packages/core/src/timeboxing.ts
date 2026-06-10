/**
 * MÓDULO 6 — Timeboxing Inteligente
 * Reparte las horas estimadas de una tarea en bloques de calendario,
 * respetando horario laboral, eventos existentes y un tamaño máximo de bloque.
 * Detecta sobrecarga (no cabe antes del due date) y lo reporta.
 */

import type { WorkingHours } from './capacity';

export interface BusySlot {
  start: Date;
  end: Date;
}

export interface TimeboxRequest {
  taskId: string;
  userId: string;
  estimatedHours: number;
  dueDate: Date | null;
  workingHours: WorkingHours;
  /** bloques ya ocupados del usuario (otros timeboxes, reuniones) */
  busy: BusySlot[];
  /** desde cuándo empezar a planificar (normalmente "ahora") */
  from: Date;
  /** preferencias */
  maxBlockHours?: number; // por defecto 2h (técnica pomodoro extendida)
  minBlockHours?: number; // por defecto 0.5h
  horizonDays?: number; // ventana máxima de búsqueda, por defecto 30
}

export interface ProposedBlock {
  taskId: string;
  userId: string;
  start: Date;
  end: Date;
  hours: number;
}

export interface TimeboxResult {
  blocks: ProposedBlock[];
  scheduledHours: number;
  unscheduledHours: number; // > 0 ⇒ sobrecarga
  overloaded: boolean;
  missesDueDate: boolean;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const MS_HOUR = 3_600_000;

/** ¿se solapan [aS,aE) y [bS,bE)? */
function overlaps(aS: Date, aE: Date, bS: Date, bE: Date): boolean {
  return aS < bE && bS < aE;
}

/** Devuelve los tramos libres de un día, en orden, ya recortados por `from`. */
function freeSlotsForDay(
  day: Date,
  wh: WorkingHours,
  busy: BusySlot[],
  from: Date,
): BusySlot[] {
  const window = wh[DAY_KEYS[day.getDay()]];
  if (!window) return [];

  const dayStart = new Date(day);
  dayStart.setHours(window[0], 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(window[1], 0, 0, 0);

  let cursor = dayStart < from ? new Date(from) : dayStart;
  if (cursor >= dayEnd) return [];

  // ordenar ocupados del día
  const todays = busy
    .filter((b) => overlaps(b.start, b.end, dayStart, dayEnd))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const free: BusySlot[] = [];
  for (const b of todays) {
    if (b.start > cursor) free.push({ start: new Date(cursor), end: new Date(b.start) });
    if (b.end > cursor) cursor = new Date(b.end);
    if (cursor >= dayEnd) break;
  }
  if (cursor < dayEnd) free.push({ start: new Date(cursor), end: new Date(dayEnd) });

  return free.filter((s) => s.end.getTime() - s.start.getTime() >= 0);
}

/**
 * Algoritmo greedy: avanza día a día llenando los tramos libres con bloques
 * de hasta `maxBlockHours` hasta agotar las horas estimadas o el horizonte.
 */
export function generateTimeboxes(req: TimeboxRequest): TimeboxResult {
  const maxBlock = req.maxBlockHours ?? 2;
  const minBlock = req.minBlockHours ?? 0.5;
  const horizon = req.horizonDays ?? 30;

  let remaining = req.estimatedHours;
  const blocks: ProposedBlock[] = [];
  const day = new Date(req.from);
  day.setHours(0, 0, 0, 0);

  for (let d = 0; d < horizon && remaining > 1e-6; d++) {
    const free = freeSlotsForDay(day, req.workingHours, req.busy, req.from);
    for (const slot of free) {
      let slotHours = (slot.end.getTime() - slot.start.getTime()) / MS_HOUR;
      let blockStart = new Date(slot.start);
      while (slotHours >= minBlock && remaining > 1e-6) {
        const hours = Math.min(maxBlock, slotHours, remaining);
        if (hours < minBlock) break;
        const blockEnd = new Date(blockStart.getTime() + hours * MS_HOUR);
        blocks.push({
          taskId: req.taskId,
          userId: req.userId,
          start: new Date(blockStart),
          end: blockEnd,
          hours: Math.round(hours * 100) / 100,
        });
        remaining -= hours;
        slotHours -= hours;
        // pequeño respiro de 15 min entre bloques
        blockStart = new Date(blockEnd.getTime() + 15 * 60_000);
        slotHours -= 0.25;
      }
      if (remaining <= 1e-6) break;
    }
    day.setDate(day.getDate() + 1);
  }

  const scheduledHours = req.estimatedHours - Math.max(remaining, 0);
  const lastBlock = blocks[blocks.length - 1];
  const missesDueDate =
    !!req.dueDate &&
    (remaining > 1e-6 || (!!lastBlock && lastBlock.end > req.dueDate));

  return {
    blocks,
    scheduledHours: Math.round(scheduledHours * 100) / 100,
    unscheduledHours: Math.round(Math.max(remaining, 0) * 100) / 100,
    overloaded: remaining > 1e-6,
    missesDueDate,
  };
}
