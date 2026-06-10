'use client';

import { useQuery } from '@tanstack/react-query';
import { bandFor, bandEmoji } from '@projectos/core';
import { getProjects, getTodayTasks } from '@/lib/supabase/queries';

function Kpi({ label, value, sub, tone = 'zinc' }: { label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold text-zinc-100 mt-1">{value}</div>
      {sub && <div className={`text-xs text-${tone}-400 mt-1`}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const projects = useQuery({ queryKey: ['projects'], queryFn: getProjects });
  const today = useQuery({ queryKey: ['today'], queryFn: getTodayTasks });

  const list = projects.data ?? [];
  const atRisk = list.filter((p) => p.status === 'AT_RISK').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-lg font-semibold text-zinc-100 mb-1">Dashboard ejecutivo</h1>
      <p className="text-sm text-zinc-500 mb-5">Visión general en tiempo real</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Proyectos activos" value={list.filter((p) => p.status !== 'DONE').length} sub="en curso" />
        <Kpi label="En riesgo" value={atRisk} sub={atRisk ? '¡atención!' : 'al día'} tone={atRisk ? 'rose' : 'emerald'} />
        <Kpi label="Tareas de hoy" value={today.data?.length ?? 0} sub="priorizadas" tone="indigo" />
        <Kpi label="Proyectos" value={list.length} sub="totales" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm font-medium text-zinc-200 mb-3">🔥 Prioridades de hoy</div>
          {today.isLoading && <p className="text-sm text-zinc-500">Cargando…</p>}
          {(today.data ?? []).slice(0, 6).map((t) => {
            const b = bandFor(t.priority_score);
            return (
              <div key={t.id} className="flex items-center gap-2 py-1.5 text-sm border-b border-zinc-800/60 last:border-0">
                <span>{bandEmoji(b)}</span>
                <span className="flex-1 text-zinc-300 truncate">{t.title}</span>
                <span className="text-xs text-zinc-500 w-8 text-right">{t.priority_score}</span>
              </div>
            );
          })}
          {today.data?.length === 0 && <p className="text-sm text-zinc-500">Sin tareas para hoy.</p>}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm font-medium text-zinc-200 mb-3">Proyectos</div>
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-1.5 text-sm border-b border-zinc-800/60 last:border-0">
              <span className="flex-1 text-zinc-300 truncate">{p.name}</span>
              <span className="text-xs text-zinc-500">{p.status}</span>
              <span className={`text-xs ${p.risk_score >= 60 ? 'text-rose-400' : 'text-zinc-500'}`}>
                {Math.round(p.risk_score)}%
              </span>
            </div>
          ))}
          {projects.isLoading && <p className="text-sm text-zinc-500">Cargando…</p>}
        </section>
      </div>
    </div>
  );
}
