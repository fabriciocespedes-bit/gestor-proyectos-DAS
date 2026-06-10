'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { bandFor, bandEmoji } from '@projectos/core';
import { KanbanColumn } from './KanbanColumn';
import { useMoveTask } from '@/lib/hooks/use-tasks';

export interface Task {
  id: string;
  key: string; // OPS-12
  title: string;
  assigneeName?: string;
  estimatedHours?: number;
  actualHours: number;
  priorityScore: number;
  columnId: string;
  order: number;
  checklistDone: number;
  checklistTotal: number;
  commentCount: number;
  blockedBy: number;
}

export interface Column {
  id: string;
  name: string;
  wipLimit?: number;
}

/** Orden fraccional: nuevo order = punto medio entre vecinos. O(1), sin reindexar. */
function computeOrder(prev?: number, next?: number): number {
  if (prev == null && next == null) return 1024;
  if (prev == null) return next! / 2;
  if (next == null) return prev + 1024;
  return (prev + next) / 2;
}

export function KanbanBoard({
  columns,
  initialTasks,
}: {
  columns: Column[];
  initialTasks: Task[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const moveTask = useMoveTask();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    const taskId = e.active.id as string;
    const targetColumnId = e.over?.id as string | undefined;
    if (!targetColumnId) return;

    const column = tasks
      .filter((t) => t.columnId === targetColumnId)
      .sort((a, b) => a.order - b.order);
    const newOrder = computeOrder(column.at(-1)?.order, undefined);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, columnId: targetColumnId, order: newOrder } : t,
      ),
    );
    moveTask.mutate({ taskId, columnId: targetColumnId, order: newOrder });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {columns.map((col) => {
          const colTasks = tasks
            .filter((t) => t.columnId === col.id)
            .sort((a, b) => a.order - b.order)
            .map((t) => ({
              ...t,
              band: bandFor(t.priorityScore),
              emoji: bandEmoji(bandFor(t.priorityScore)),
            }));
          const overWip = col.wipLimit != null && colTasks.length > col.wipLimit;
          return (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={colTasks}
              overWip={overWip}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
