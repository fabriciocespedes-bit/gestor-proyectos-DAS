-- ════════════════════════════════════════════════════════════════════════
-- ProjectOS · Supabase — 0001 Schema inicial
-- Postgres + Supabase Auth. Los usuarios viven en auth.users; profiles los
-- extiende. Multi-tenant por organization_id (denormalizado para RLS rápido).
-- Ejecutar en el SQL Editor de Supabase o con `supabase db push`.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";       -- gen_random_uuid(), crypt()

-- ── Enums ───────────────────────────────────────────────────────────────
create type plan_t            as enum ('FREE','TEAM','BUSINESS','ENTERPRISE');
create type org_role_t        as enum ('OWNER','ADMIN','MANAGER','MEMBER','GUEST');
create type project_status_t  as enum ('IDEA','PLANNING','EXECUTING','AT_RISK','PAUSED','DONE');
create type priority_t        as enum ('CRITICAL','HIGH','MEDIUM','LOW');
create type task_status_t     as enum ('BACKLOG','TODO','THIS_WEEK','TODAY','IN_PROGRESS','BLOCKED','IN_REVIEW','DONE');
create type dependency_t      as enum ('FINISH_TO_START','START_TO_START','FINISH_TO_FINISH','START_TO_FINISH');
create type timeblock_state_t as enum ('PLANNED','ACTIVE','DONE','SKIPPED');
create type timeblock_src_t   as enum ('AUTO','MANUAL');
create type doc_type_t        as enum ('WIKI','MINUTES','PROCEDURE','LOGBOOK');
create type notif_type_t      as enum ('DUE_SOON','BLOCKED','OVERLOAD','CRITICAL_DEP','RISK');
create type notif_channel_t   as enum ('EMAIL','SLACK','TEAMS','WHATSAPP','IN_APP');

-- ── Identidad ───────────────────────────────────────────────────────────
-- profiles 1:1 con auth.users (Supabase Auth gestiona email+contraseña).
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text unique not null,
  name           text not null default '',
  avatar_url     text,
  is_super_admin boolean not null default false,
  weekly_hours   real not null default 40,
  timezone       text not null default 'UTC',
  working_hours  jsonb not null default '{"mon":[9,18],"tue":[9,18],"wed":[9,18],"thu":[9,18],"fri":[9,17]}',
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  plan       plan_t not null default 'FREE',
  seats      int not null default 5,
  settings   jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table memberships (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role            org_role_t not null default 'MEMBER',
  created_at      timestamptz not null default now(),
  unique (user_id, organization_id)
);
create index on memberships (organization_id);
create index on memberships (user_id);

create table teams (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now()
);
create index on teams (organization_id);

create table team_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  team_id         uuid not null references teams(id) on delete cascade,
  membership_id   uuid not null references memberships(id) on delete cascade,
  capacity_pct    real not null default 100,
  unique (team_id, membership_id)
);
create index on team_members (organization_id);

-- ── Proyectos ───────────────────────────────────────────────────────────
create table projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  team_id         uuid references teams(id),
  key             text not null,
  name            text not null,
  description     text,
  goal            text,
  status          project_status_t not null default 'IDEA',
  priority        priority_t not null default 'MEDIUM',
  sponsor_id      uuid references profiles(id),
  owner_id        uuid references profiles(id),
  start_date      timestamptz,
  due_date        timestamptz,
  risk_score      real not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (organization_id, key)
);
create index on projects (organization_id, status);

create table board_columns (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  name            text not null,
  "order"         int not null,
  wip_limit       int
);
create index on board_columns (project_id);
create index on board_columns (organization_id);

create table milestones (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  name            text not null,
  due_date        timestamptz not null,
  reached         boolean not null default false
);
create index on milestones (project_id);
create index on milestones (organization_id);

-- ── Tareas ──────────────────────────────────────────────────────────────
create table tasks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  column_id       uuid references board_columns(id),
  number          int not null,
  title           text not null,
  description     text,
  status          task_status_t not null default 'TODO',
  priority        priority_t not null default 'MEDIUM',
  impact          int not null default 3,
  urgency         int not null default 3,
  strategic_value int not null default 3,
  risk_factor     int not null default 2,
  priority_score  real not null default 0,
  estimated_hours real,
  actual_hours    real not null default 0,
  assignee_id     uuid references profiles(id),
  reporter_id     uuid references profiles(id),
  due_date        timestamptz,
  start_date      timestamptz,
  "order"         double precision not null default 0,
  key_result_id   uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (project_id, number)
);
create index on tasks (organization_id, status);
create index on tasks (project_id, status);
create index on tasks (assignee_id);
create index on tasks (priority_score);

create table dependencies (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  dependent_id    uuid not null references tasks(id) on delete cascade,
  blocking_id     uuid not null references tasks(id) on delete cascade,
  type            dependency_t not null default 'FINISH_TO_START',
  unique (dependent_id, blocking_id)
);
create index on dependencies (blocking_id);
create index on dependencies (organization_id);

create table checklist_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  task_id         uuid not null references tasks(id) on delete cascade,
  text            text not null,
  done            boolean not null default false,
  "order"         int not null
);
create index on checklist_items (task_id);
create index on checklist_items (organization_id);

create table labels (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  color           text not null,
  unique (organization_id, name)
);

create table task_labels (
  organization_id uuid not null references organizations(id) on delete cascade,
  task_id         uuid not null references tasks(id) on delete cascade,
  label_id        uuid not null references labels(id) on delete cascade,
  primary key (task_id, label_id)
);
create index on task_labels (organization_id);

create table comments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  task_id         uuid not null references tasks(id) on delete cascade,
  author_id       uuid not null references profiles(id),
  body            text not null,
  created_at      timestamptz not null default now()
);
create index on comments (task_id);
create index on comments (organization_id);

create table attachments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  task_id         uuid not null references tasks(id) on delete cascade,
  file_name       text not null,
  storage_path    text not null,   -- ruta en el bucket 'attachments'
  size_bytes      int not null,
  mime_type       text not null,
  created_at      timestamptz not null default now()
);
create index on attachments (task_id);
create index on attachments (organization_id);

-- ── Timeboxing ──────────────────────────────────────────────────────────
create table time_blocks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  task_id         uuid not null references tasks(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  "start"         timestamptz not null,
  "end"           timestamptz not null,
  status          timeblock_state_t not null default 'PLANNED',
  source          timeblock_src_t not null default 'AUTO'
);
create index on time_blocks (user_id, "start");
create index on time_blocks (task_id);
create index on time_blocks (organization_id);

-- ── OKR ─────────────────────────────────────────────────────────────────
create table objectives (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title           text not null,
  description     text,
  period          text not null,
  progress        real not null default 0
);
create index on objectives (organization_id, period);

create table key_results (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  objective_id    uuid not null references objectives(id) on delete cascade,
  title           text not null,
  metric          text not null,
  unit            text not null default '%',
  start_value     real not null default 0,
  target_value    real not null,
  current_value   real not null default 0
);
create index on key_results (objective_id);

-- enlaces KR ↔ proyecto / tarea
create table key_result_projects (
  key_result_id uuid not null references key_results(id) on delete cascade,
  project_id    uuid not null references projects(id) on delete cascade,
  primary key (key_result_id, project_id)
);
-- FK desde tasks.key_result_id (declarada aquí para evitar orden de creación)
alter table tasks add constraint tasks_key_result_fk
  foreign key (key_result_id) references key_results(id) on delete set null;

-- ── Documentación (estilo Notion: bloques JSON) ─────────────────────────
create table documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  type            doc_type_t not null default 'WIKI',
  title           text not null,
  content         jsonb not null default '{"blocks":[]}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on documents (project_id, type);
create index on documents (organization_id);

-- ── Actividad & Notificaciones ──────────────────────────────────────────
create table activities (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id),
  entity          text not null,
  entity_id       uuid not null,
  action          text not null,
  source          text not null default 'user',
  meta            jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index on activities (entity, entity_id);
create index on activities (organization_id);

create table notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  type            notif_type_t not null,
  channel         notif_channel_t not null,
  payload         jsonb not null,
  read            boolean not null default false,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index on notifications (user_id, read);
create index on notifications (organization_id);
