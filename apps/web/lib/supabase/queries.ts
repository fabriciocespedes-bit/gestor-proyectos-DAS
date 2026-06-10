'use client';

import { supabase } from './client';

/** Todas las consultas quedan AUTO-aisladas por RLS (la org del usuario). */

export async function getProjects() {
  const { data, error } = await supabase()
    .from('projects')
    .select('id,name,status,risk_score')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTodayTasks() {
  const { data: auth } = await supabase().auth.getUser();
  const uid = auth.user?.id;
  const { data, error } = await supabase()
    .from('tasks')
    .select('id,title,priority_score,estimated_hours')
    .eq('assignee_id', uid)
    .in('status', ['TODAY', 'IN_PROGRESS', 'THIS_WEEK'])
    .is('deleted_at', null)
    .order('priority_score', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function getBoard(projectId: string) {
  const { data, error } = await supabase()
    .from('board_columns')
    .select(
      'id,name,wip_limit,order,' +
        'tasks(id,number,title,priority_score,estimated_hours,actual_hours,order,assignee:profiles(name))',
    )
    .eq('project_id', projectId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function moveTask(taskId: string, columnId: string, order: number, status?: string) {
  const { error } = await supabase()
    .from('tasks')
    .update({ column_id: columnId, order, ...(status ? { status } : {}) })
    .eq('id', taskId);
  if (error) throw error;
}

/** Capacidad: calculada en cliente desde profiles + tasks de la ventana. */
export async function getCapacity(fromISO: string, toISO: string) {
  const weeks = Math.max((new Date(toISO).getTime() - new Date(fromISO).getTime()) / (7 * 86_400_000), 0.0001);
  const { data: people } = await supabase().from('profiles').select('id,name,weekly_hours');
  const { data: tasks } = await supabase()
    .from('tasks')
    .select('assignee_id,estimated_hours')
    .gte('due_date', fromISO)
    .lte('due_date', toISO)
    .is('deleted_at', null);

  return (people ?? []).map((p) => {
    const assigned = (tasks ?? [])
      .filter((t) => t.assignee_id === p.id)
      .reduce((s, t) => s + (t.estimated_hours ?? 0), 0);
    const available = p.weekly_hours * weeks;
    return {
      user: p.name,
      assigned: Math.round(assigned * 10) / 10,
      available: Math.round(available * 10) / 10,
      occupancyPct: available > 0 ? Math.round((assigned / available) * 100) : 0,
    };
  });
}
