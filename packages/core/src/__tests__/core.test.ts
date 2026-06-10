import { describe, it, expect } from 'vitest';
import {
  computePriorityScore,
  bandFor,
  computeUrgency,
  computeCapacity,
  generateTimeboxes,
  computeSchedule,
  wouldCreateCycle,
} from '../index';

describe('prioritization', () => {
  it('tarea máxima → score crítico', () => {
    const s = computePriorityScore({
      impact: 5,
      urgency: 5,
      strategicValue: 5,
      riskFactor: 5,
      blockingCount: 10,
    });
    expect(s).toBeGreaterThanOrEqual(95);
    expect(bandFor(s)).toBe('CRITICAL');
  });

  it('tarea mínima → score bajo', () => {
    const s = computePriorityScore({
      impact: 0,
      urgency: 0,
      strategicValue: 0,
      riskFactor: 0,
      blockingCount: 0,
    });
    expect(bandFor(s)).toBe('LOW');
  });

  it('urgencia crece al acercarse el due date', () => {
    const now = new Date('2026-06-08T09:00:00Z');
    const soon = computeUrgency(new Date('2026-06-09T09:00:00Z'), now);
    const far = computeUrgency(new Date('2026-07-20T09:00:00Z'), now);
    expect(soon).toBeGreaterThan(far);
  });
});

describe('capacity', () => {
  const wh = {
    mon: [9, 18] as [number, number],
    tue: [9, 18] as [number, number],
    wed: [9, 18] as [number, number],
    thu: [9, 18] as [number, number],
    fri: [9, 17] as [number, number],
  };

  it('detecta sobrecarga (RED)', () => {
    const r = computeCapacity(
      {
        userId: 'u1',
        weeklyHours: 40,
        workingHours: wh,
        assignedHours: 50,
        reservedHours: 0,
      },
      new Date('2026-06-08T00:00:00Z'),
      new Date('2026-06-12T23:59:59Z'),
    );
    expect(r.flag).toBe('RED');
    expect(r.burnoutRisk).toBeGreaterThan(0);
  });
});

describe('timeboxing', () => {
  it('reparte 4h en bloques dentro del horario laboral', () => {
    const res = generateTimeboxes({
      taskId: 't1',
      userId: 'u1',
      estimatedHours: 4,
      dueDate: new Date('2026-06-12T18:00:00'),
      workingHours: { mon: [9, 18] },
      busy: [],
      from: new Date('2026-06-08T09:00:00'), // lunes
      maxBlockHours: 2,
    });
    expect(res.scheduledHours).toBeCloseTo(4, 1);
    expect(res.overloaded).toBe(false);
    expect(res.blocks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('scheduling / CPM', () => {
  it('calcula camino crítico', () => {
    const r = computeSchedule([
      { id: 'A', duration: 3, deps: [] },
      { id: 'B', duration: 2, deps: ['A'] },
      { id: 'C', duration: 4, deps: ['A'] },
      { id: 'D', duration: 1, deps: ['B', 'C'] },
    ]);
    expect(r.projectDuration).toBe(8); // A(3)+C(4)+D(1)
    expect(r.criticalPath).toEqual(['A', 'C', 'D']);
  });

  it('detecta ciclos', () => {
    expect(
      wouldCreateCycle(
        [
          { id: 'A', duration: 1, deps: ['B'] },
          { id: 'B', duration: 1, deps: [] },
        ],
        'B',
        'A',
      ),
    ).toBe(true);
  });
});
