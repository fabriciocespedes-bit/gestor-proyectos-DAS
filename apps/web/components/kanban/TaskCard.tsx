'use client';

import { useDraggable } from '@dnd-kit/core';

export function TaskCard({ task }: { task: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={
        'cursor-grab rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm ' +
        'dark:border-zinc-800 dark:bg-zinc-900 ' +
        (isDragging ? 'opacity-50 ring-2 ring-indigo-500' : '')
      }
    >
      <div className="mb-1 flex items-center gap-1.5 text-xs text-zinc-400">
        <span>{task.emoji}</span>
        <span className="font-mono">{task.key}</span>
        {task.blockedBy > 0 && (
          <span className="ml-auto text-rose-500">🔗 {task.blockedBy}</span>
        )}
      </div>

      <p className="text-sm text-zinc-800 dark:text-zinc-100">{task.title}</p>

      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
        {task.assigneeName && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/15 text-[10px] text-indigo-500">
            {task.assigneeName.slice(0, 2).toUpperCase()}
          </span>
        )}
        {task.estimatedHours != null && (
          <span>
            {task.actualHours}h/{task.estimatedHours}h
          </span>
        )}
        {task.checklistTotal > 0 && (
          <span>
            ☑ {task.checklistDone}/{task.checklistTotal}
          </span>
        )}
        {task.commentCount > 0 && <span>💬 {task.commentCount}</span>}
      </div>
    </article>
  );
}
