'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBoard } from '@/lib/supabase/queries';
import { KanbanBoard, type Task, type Column } from '@/components/kanban/KanbanBoard';

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const board = useQuery({ queryKey: ['board', id], queryFn: () => getBoard(id) });

  if (board.isLoading) return <div className="p-6 text-sm text-zinc-500">Cargando tablero…</div>;
  if (board.error) return <div className="p-6 text-sm text-rose-400">Error al cargar el tablero.</div>;

  const cols = board.data ?? [];
  const columns: Column[] = cols.map((c: any) => ({
    id: c.id,
    name: c.name,
    wipLimit: c.wip_limit ?? undefined,
  }));

  const tasks: Task[] = cols.flatMap((c: any) =>
    (c.tasks ?? []).map((t: any) => ({
      id: t.id,
      key: `${t.number}`,
      title: t.title,
      assigneeName: t.assignee?.name,
      estimatedHours: t.estimated_hours ?? undefined,
      actualHours: t.actual_hours ?? 0,
      priorityScore: t.priority_score ?? 0,
      columnId: c.id,
      order: t.order ?? 0,
      checklistDone: 0,
      checklistTotal: 0,
      commentCount: 0,
      blockedBy: 0,
    })),
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4">
        <h1 className="text-lg font-semibold text-zinc-100">Tablero</h1>
      </div>
      <div className="flex-1">
        <KanbanBoard columns={columns} initialTasks={tasks} />
      </div>
    </div>
  );
}
