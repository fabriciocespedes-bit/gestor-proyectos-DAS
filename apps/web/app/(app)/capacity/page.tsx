'use client';

import { useQuery } from '@tanstack/react-query';
import { getCapacity } from '@/lib/supabase/queries';

function weekRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function CapacityPage() {
  const { from, to } = weekRange();
  const cap = useQuery({
    queryKey: ['capacity', from],
    queryFn: () => getCapacity(from, to),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-lg font-semibold text-zinc-100 mb-1">Capacidad del equipo</h1>
      <p className="text-sm text-zinc-500 mb-5">Ocupación de la semana actual</p>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 border-b border-zinc-800">
              <th className="text-left font-normal p-3">Persona</th>
              <th className="font-normal p-3">Asignadas</th>
              <th className="font-normal p-3">Disponibles</th>
              <th className="text-right font-normal p-3 pr-4">Ocupación</th>
            </tr>
          </thead>
          <tbody>
            {(cap.data ?? []).map((r) => {
              const tone = r.occupancyPct > 100 ? 'rose' : r.occupancyPct >= 80 ? 'amber' : 'emerald';
              return (
                <tr key={r.user} className="border-b border-zinc-800/50 last:border-0">
                  <td className="p-3 text-zinc-300">{r.user}</td>
                  <td className="p-3 text-center text-zinc-400">{r.assigned}h</td>
                  <td className="p-3 text-center text-zinc-400">{r.available}h</td>
                  <td className="p-3 pr-4 text-right">
                    <span className={`inline-block px-2 py-1 rounded bg-${tone}-500/15 text-${tone}-400 text-xs`}>
                      {r.occupancyPct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {cap.isLoading && <p className="p-3 text-sm text-zinc-500">Cargando…</p>}
      </div>
    </div>
  );
}
