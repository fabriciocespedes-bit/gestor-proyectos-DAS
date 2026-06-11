-- ════════════════════════════════════════════════════════════════════════
-- 0004_prioridades_checklist.sql
-- Lista personal de prioridades (checklist) en el panel Prioridades.
-- Independiente de las tareas. Cada usuario ve y edita SOLO la suya.
-- Ejecutar en Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════════════
create table if not exists priority_items (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references profiles(id) on delete cascade,
  text       text not null default '',
  done       boolean not null default false,
  done_at    timestamptz,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

alter table priority_items enable row level security;

create policy prio_own on priority_items
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index if not exists idx_prio_owner on priority_items(owner_id);
