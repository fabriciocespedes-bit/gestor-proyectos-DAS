'use client';

import { useQuery } from '@tanstack/react-query';
import { bandFor, bandEmoji } from '@projectos/core';
import { getTodayTasks } from '@/lib/supabase/queries';

export default function TodayPage() {
  const today = useQuery({ queryKey: ['today'], queryFn: getTodayTasks });
  const tasks = today.data ?? [];
  const totalHours = tasks.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);
  const occ = Math.round((totalHours / 8) * 100);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-lg font-semibold text-zinc-100 mb-1">Mi día</h1>
      <p className="text-sm text-zinc-500 mb-5">Tareas priorizadas y timeboxing</p>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-zinc-200">Foco de hoy</span>
          <span className={`text-sm ${occ > 100 ? 'text-rose-400' : occ >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {occ}% ocupación
          </span>
        </div>
        {today.isLoading && <p className="text-sm text-zinc-500">Cargando…</p>}
        {tasks.map((t) => {
          const b = bandFor(t.priority_score);
          return (
            <div key={t.id} className="flex items-center gap-2 py-2 text-sm border-b border-zinc-800/60 last:border-0">
              <span>{bandEmoji(b)}</span>
              <span className="flex-1 text-zinc-300 truncate">{t.title}</span>
              {t.estimated_hours != null && <span className="text-xs text-zinc-500">{t.estimated_hours}h</span>}
              <span className="text-xs text-zinc-500 w-8 text-right">{t.priority_score}</span>
            </div>
          );
        })}
        {tasks.length === 0 && !today.isLoading && <p className="text-sm text-zinc-500">Nada pendiente para hoy 🎉</p>}
      </div>
    </div>
  );
}
