/**
 * MÓDULO 7 — Gestión de Capacidad
 * Calcula carga vs. disponibilidad por persona en una ventana temporal y
 * deriva ocupación, semáforo y riesgo de burnout.
 */

export interface WorkingHours {
  // [horaInicio, horaFin] en hora local; ausente = día no laborable
  mon?: [number, number];
  tue?: [number, number];
  wed?: [number, number];
  thu?: [number, number];
  fri?: [number, number];
  sat?: [number, number];
  sun?: [number, number];
}

export interface PersonLoadInput {
  userId: string;
  weeklyHours: number; // disponibilidad contractual base
  workingHours: WorkingHours;
  /** suma de horas estimadas de tareas asignadas en la ventana */
  assignedHours: number;
  /** PTO / feriados / reuniones fijas en la ventana, en horas */
  reservedHours: number;
}

export type CapacityFlag = 'GREEN' | 'YELLOW' | 'RED';

export interface CapacityResult {
  userId: string;
  availableHours: number;
  assignedHours: number;
  occupancyPct: number; // puede superar 100
  flag: CapacityFlag;
  burnoutRisk: number; // 0–100
}

const DAY_KEYS: (keyof WorkingHours)[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];

/** Horas laborables reales entre dos fechas según el calendario semanal. */
export function workingHoursInWindow(
  wh: WorkingHours,
  start: Date,
  end: Date,
): number {
  let total = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const slot = wh[DAY_KEYS[cursor.getDay()]];
    if (slot) total += slot[1] - slot[0];
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

export function computeCapacity(
  input: PersonLoadInput,
  windowStart: Date,
  windowEnd: Date,
): CapacityResult {
  const calendarHours = workingHoursInWindow(
    input.workingHours,
    windowStart,
    windowEnd,
  );
  // El menor entre el calendario real y la disponibilidad contractual prorrateada
  const weeks =
    (windowEnd.getTime() - windowStart.getTime()) / (7 * 86_400_000);
  const contractHours = input.weeklyHours * Math.max(weeks, 0);
  const grossAvailable = Math.min(calendarHours, contractHours || calendarHours);
  const availableHours = Math.max(grossAvailable - input.reservedHours, 0);

  const occupancyPct =
    availableHours > 0
      ? (input.assignedHours / availableHours) * 100
      : input.assignedHours > 0
        ? 999
        : 0;

  const flag: CapacityFlag =
    occupancyPct > 100 ? 'RED' : occupancyPct >= 80 ? 'YELLOW' : 'GREEN';

  // Riesgo de burnout: crece con sobre-asignación sostenida.
  // 80% → 0, 100% → ~40, 130% → ~85, ≥150% → 100.
  const over = Math.max(occupancyPct - 80, 0);
  const burnoutRisk = Math.round(Math.min((over / 70) * 100, 100));

  return {
    userId: input.userId,
    availableHours: Math.round(availableHours * 10) / 10,
    assignedHours: input.assignedHours,
    occupancyPct: Math.round(occupancyPct),
    flag,
    burnoutRisk,
  };
}

/** Agregado de equipo: ocupación promedio ponderada por disponibilidad. */
export function teamCapacity(results: CapacityResult[]): {
  avgOccupancy: number;
  overloaded: string[];
} {
  const totalAvail = results.reduce((s, r) => s + r.availableHours, 0);
  const totalAssigned = results.reduce((s, r) => s + r.assignedHours, 0);
  return {
    avgOccupancy:
      totalAvail > 0 ? Math.round((totalAssigned / totalAvail) * 100) : 0,
    overloaded: results.filter((r) => r.flag === 'RED').map((r) => r.userId),
  };
}
