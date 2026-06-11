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
  quadrant   text not null default 'hu',   -- cuadrante Eisenhower: hu/hn/uu/nn
  position   int not null default 0,
  created_at timestamptz not null default now()
);
-- Si la tabla ya existía (migración 0004 previa sin la columna):
alter table priority_items add column if not exists quadrant text not null default 'hu';

alter table priority_items enable row level security;

-- Lectura: el dueño o un administrador (supervisión). Escritura: SOLO el dueño.
drop policy if exists prio_own on priority_items;
create policy prio_read   on priority_items for select using (owner_id = auth.uid() or is_admin());
create policy prio_insert on priority_items for insert with check (owner_id = auth.uid());
create policy prio_update on priority_items for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy prio_delete on priority_items for delete using (owner_id = auth.uid());

create index if not exists idx_prio_owner on priority_items(owner_id);
