/**
 * MÓDULO 5 — Priorización Inteligente
 * Priority Score (0–100) = ponderación de Impacto, Urgencia, Valor Estratégico,
 * Dependencias y Riesgo. Función pura: misma entrada → misma salida.
 */

export interface PriorityInputs {
  impact: number; // 0–5
  urgency: number; // 0–5  (puede derivarse de la fecha límite, ver computeUrgency)
  strategicValue: number; // 0–5
  riskFactor: number; // 0–5
  /** nº de tareas que dependen de esta (bloquea a otras) */
  blockingCount: number;
}

/** Pesos que suman 1. Ajustables por organización en settings. */
export const DEFAULT_WEIGHTS = {
  impact: 0.3,
  urgency: 0.25,
  strategicValue: 0.2,
  dependencies: 0.15,
  risk: 0.1,
} as const;

export type PriorityWeights = typeof DEFAULT_WEIGHTS;

export type PriorityBand = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/**
 * Urgencia derivada de la fecha límite. 5 = vencida/hoy, 0 = a >30 días.
 * Curva no lineal: la urgencia crece rápido en la última semana.
 */
export function computeUrgency(dueDate: Date | null, now: Date): number {
  if (!dueDate) return 1; // sin fecha → baja urgencia base
  const days = (dueDate.getTime() - now.getTime()) / 86_400_000;
  if (days <= 0) return 5;
  if (days <= 1) return 4.5;
  if (days <= 3) return 4;
  if (days <= 7) return 3;
  if (days <= 14) return 2;
  if (days <= 30) return 1;
  return 0.5;
}

/** Saturación logarítmica: 0 deps → 0, mucho impacto marginal decreciente. */
function dependencyScore(blockingCount: number): number {
  // 0→0, 1→~2.3, 3→~3.6, 7→~4.5, 15+→5 (escala 0–5)
  return clamp(Math.log2(blockingCount + 1) * 1.6, 0, 5);
}

export function computePriorityScore(
  input: PriorityInputs,
  weights: PriorityWeights = DEFAULT_WEIGHTS,
): number {
  const impact = clamp(input.impact, 0, 5);
  const urgency = clamp(input.urgency, 0, 5);
  const strategic = clamp(input.strategicValue, 0, 5);
  const risk = clamp(input.riskFactor, 0, 5);
  const deps = dependencyScore(input.blockingCount);

  const weighted =
    impact * weights.impact +
    urgency * weights.urgency +
    strategic * weights.strategicValue +
    deps * weights.dependencies +
    risk * weights.risk;

  // weighted está en escala 0–5 → normalizar a 0–100
  return Math.round((weighted / 5) * 100);
}

export function bandFor(score: number): PriorityBand {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

export function bandEmoji(band: PriorityBand): string {
  return { CRITICAL: '🔥', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' }[band];
}
