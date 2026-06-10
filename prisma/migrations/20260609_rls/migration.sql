-- ════════════════════════════════════════════════════════════════════════
-- Row-Level Security (RLS) — aislamiento multi-tenant a nivel de PostgreSQL
-- Defensa en profundidad: aunque una query de la app olvide filtrar por
-- organización, la base de datos rechaza filas de otros tenants.
-- Ejecutar DESPUÉS de `prisma migrate` (las tablas ya existen).
-- ════════════════════════════════════════════════════════════════════════

-- ── 0) Roles de runtime ────────────────────────────────────────────────
-- El API se conecta como projectos_app (SIN privilegios de superusuario).
-- Crucial: FORCE ROW LEVEL SECURITY (más abajo) hace que las políticas
-- apliquen incluso al dueño de la tabla; los superusuarios SIEMPRE saltan RLS,
-- por eso el runtime nunca debe usar el rol superusuario.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'projectos_app') THEN
    -- La contraseña real vive en AWS Secrets Manager; esto es solo bootstrap local.
    CREATE ROLE projectos_app LOGIN PASSWORD 'change_me';
  END IF;
  -- Rol exclusivo del módulo de identidad (login/registro), que debe poder
  -- buscar usuarios ANTES de existir contexto de organización.
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'projectos_auth') THEN
    CREATE ROLE projectos_auth LOGIN PASSWORD 'change_me' BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO projectos_app, projectos_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO projectos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO projectos_auth;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO projectos_app, projectos_auth;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO projectos_app, projectos_auth;

-- ── 1) Contexto de la petición (GUC fijados por transacción) ───────────
CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO projectos_app, projectos_auth;

-- El 2º arg `true` evita error si el GUC no está definido (fail-closed: NULL).
CREATE OR REPLACE FUNCTION app.current_org() RETURNS text
  LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('app.current_org_id', true), '')
  $$;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS text
  LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('app.current_user_id', true), '')
  $$;

CREATE OR REPLACE FUNCTION app.is_superadmin() RETURNS boolean
  LANGUAGE sql STABLE AS $$
    SELECT coalesce(current_setting('app.is_superadmin', true) = 'on', false)
  $$;

-- Helper que la app llama al inicio de cada transacción (SET LOCAL).
CREATE OR REPLACE FUNCTION app.set_tenant(
  p_org  text,
  p_user text DEFAULT NULL,
  p_super boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.current_org_id',  coalesce(p_org, ''),  true);
  PERFORM set_config('app.current_user_id', coalesce(p_user, ''), true);
  PERFORM set_config('app.is_superadmin',
                     CASE WHEN p_super THEN 'on' ELSE 'off' END, true);
END $$;

-- ── 2) Política genérica de aislamiento para tablas con organizationId ──
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'Membership','Team','TeamMember','Project','BoardColumn','Milestone',
    'Task','Dependency','ChecklistItem','Label','TaskLabel','Comment',
    'Attachment','TimeBlock','Objective','KeyResult','Document',
    'Activity','Notification'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE  ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING (app.is_superadmin() OR "organizationId" = app.current_org()) '
      'WITH CHECK (app.is_superadmin() OR "organizationId" = app.current_org())',
      t);
  END LOOP;
END $$;

-- ── 3) Organization (clave por id, no organizationId) ──────────────────
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Organization";
CREATE POLICY tenant_isolation ON "Organization"
  USING (app.is_superadmin() OR id = app.current_org())
  WITH CHECK (app.is_superadmin() OR id = app.current_org());

-- ── 4) User (entidad global: un usuario puede pertenecer a varias orgs) ─
-- Visible si: es super-admin · es uno mismo · comparte la org del contexto.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_visibility ON "User";
CREATE POLICY user_visibility ON "User"
  USING (
    app.is_superadmin()
    OR id = app.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "Membership" m
      WHERE m."userId" = "User".id
        AND m."organizationId" = app.current_org()
    )
  );
-- Solo uno mismo o el super-admin puede modificar su registro de usuario.
DROP POLICY IF EXISTS user_self_write ON "User";
CREATE POLICY user_self_write ON "User"
  FOR UPDATE USING (app.is_superadmin() OR id = app.current_user_id());

-- ── 5) FKs de integridad para las columnas denormalizadas ──────────────
-- (Prisma no las crea porque organizationId es escalar sin relación.)
DO $$
DECLARE
  t text;
  denorm_tables text[] := ARRAY[
    'TeamMember','BoardColumn','Milestone','Task','Dependency','ChecklistItem',
    'TaskLabel','Comment','Attachment','TimeBlock','KeyResult','Document',
    'Activity','Notification'
  ];
BEGIN
  FOREACH t IN ARRAY denorm_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = t || '_organizationId_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I '
        'FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) '
        'ON DELETE CASCADE',
        t, t || '_organizationId_fkey');
    END IF;
  END LOOP;
END $$;

-- ── 6) Verificación rápida (debe devolver 0 filas si todo quedó forzado) ─
-- SELECT relname FROM pg_class
--   WHERE relkind='r' AND relname IN ('Task','Project','TimeBlock')
--     AND NOT relrowsecurity;
