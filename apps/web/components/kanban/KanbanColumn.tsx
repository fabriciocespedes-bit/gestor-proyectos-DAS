'use client';

import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import type { Column } from './KanbanBoard';

export function KanbanColumn({
  column,
  tasks,
  overWip,
}: {
  column: Column;
  tasks: any[];
  overWip: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
      <header className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {column.name}
        </span>
        <span
          className={
            'rounded-md px-1.5 text-xs ' +
            (overWip
              ? 'bg-rose-500/15 text-rose-500'
              : 'bg-zinc-200/60 text-zinc-500 dark:bg-zinc-800')
          }
        >
          {tasks.length}
          {column.wipLimit != null ? `/${column.wipLimit}` : ''}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={
          'flex flex-1 flex-col gap-2 p-2 transition-colors ' +
          (isOver ? 'bg-indigo-500/5' : '')
        }
      >
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
    </div>
  );
}
