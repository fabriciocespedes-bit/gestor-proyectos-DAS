// Supabase Edge Function (Deno) — Asistente de productividad serverless.
// Usa el JWT del usuario → las consultas quedan AUTO-aisladas por RLS (su org).
// POST { question } → respuesta + datos. Sin OPENAI_API_KEY usa fallback determinista.
//
// Deploy:  supabase functions deploy ai-assistant
// Invoca:  fetch('<url>/functions/v1/ai-assistant', { headers:{Authorization:`Bearer ${token}`}, ... })

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Priorización (espejo de packages/core) ──────────────────────────────
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
function urgencyFromDue(due: string | null): number {
  if (!due) return 1;
  const d = (new Date(due).getTime() - Date.now()) / 86_400_000;
  if (d <= 0) return 5; if (d <= 1) return 4.5; if (d <= 3) return 4;
  if (d <= 7) return 3; if (d <= 14) return 2; if (d <= 30) return 1; return 0.5;
}
function priorityScore(t: any): number {
  const W = { impact: .3, urgency: .25, strategic: .2, deps: .15, risk: .1 };
  const u = t.due_date ? urgencyFromDue(t.due_date) : (t.urgency ?? 3);
  const w = clamp(t.impact ?? 3, 0, 5) * W.impact + clamp(u, 0, 5) * W.urgency
          + clamp(t.strategic_value ?? 3, 0, 5) * W.strategic
          + clamp(t.risk_factor ?? 2, 0, 5) * W.risk;
  return Math.round(w / 5 * 100);
}
const band = (s: number) => s >= 75 ? '🔥' : s >= 50 ? '🟠' : s >= 25 ? '🟡' : '🟢';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const authHeader = req.headers.get('Authorization') ?? '';
  // Cliente con el token del usuario → RLS aplica automáticamente.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return json({ error: 'No autenticado' }, 401);
  }
  const userId = auth.user.id;

  let question = '';
  try {
    ({ question } = await req.json());
  } catch { /* sin cuerpo */ }
  const q = (question ?? '').toLowerCase();

  // Intent routing determinista (datos reales, ya filtrados por RLS).
  if (q.includes('atras')) {
    const { data } = await supabase
      .from('tasks')
      .select('id,title,due_date,impact,strategic_value,risk_factor,urgency,status')
      .lt('due_date', new Date().toISOString())
      .neq('status', 'DONE')
      .is('deleted_at', null);
    const tasks = (data ?? []).map((t) => ({ ...t, score: priorityScore(t) }))
      .sort((a, b) => b.score - a.score);
    return json({ answer: `Tienes ${tasks.length} tareas atrasadas.`, tasks });
  }

  if (q.includes('hoy') || q.includes('hacer')) {
    const { data } = await supabase
      .from('tasks')
      .select('id,title,due_date,impact,strategic_value,risk_factor,urgency,estimated_hours')
      .eq('assignee_id', userId)
      .in('status', ['TODAY', 'IN_PROGRESS', 'THIS_WEEK'])
      .is('deleted_at', null);
    const tasks = (data ?? []).map((t) => ({ title: t.title, hours: t.estimated_hours, emoji: band(priorityScore(t)), score: priorityScore(t) }))
      .sort((a, b) => b.score - a.score).slice(0, 10);
    return json({ answer: 'Tu foco de hoy, ordenado por prioridad:', tasks });
  }

  // Respuesta libre con OpenAI si hay clave; si no, ayuda.
  const key = Deno.env.get('OPENAI_API_KEY');
  if (key && question) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Asistente de ProjectOS. Responde breve y en español.' },
          { role: 'user', content: question },
        ],
      }),
    });
    const out = await r.json();
    return json({ answer: out.choices?.[0]?.message?.content ?? 'Sin respuesta' });
  }

  return json({
    answer: 'Puedo ayudarte con: qué está atrasado, qué hacer hoy. ' +
      '(Configura OPENAI_API_KEY para respuestas libres.)',
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
