'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moveTask } from '@/lib/supabase/queries';

/** Mueve una tarjeta (update en Supabase, RLS aplica). */
export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { taskId: string; columnId: string; order: number; status?: string }) =>
      moveTask(v.taskId, v.columnId, v.order, v.status),
    onSettled: () => qc.invalidateQueries({ queryKey: ['board'] }),
  });
}
