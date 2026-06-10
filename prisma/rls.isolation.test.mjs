// Prueba REAL de aislamiento RLS sobre PostgreSQL (PGlite/WASM).
// Reproduce el patrón de prisma/migrations/20260609_rls/migration.sql sobre un
// esquema mínimo (Organization + Task) y verifica que un tenant NO ve datos de otro.
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log('  ✓', m)) : (fail++, console.log('  ✗', m)));

await db.exec(`
  CREATE TABLE "Organization" (id text PRIMARY KEY, name text);
  CREATE TABLE "Task" (
    id text PRIMARY KEY,
    "organizationId" text NOT NULL REFERENCES "Organization"(id),
    title text
  );

  CREATE SCHEMA app;
  CREATE FUNCTION app.current_org() RETURNS text LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('app.current_org_id', true), '') $$;
  CREATE FUNCTION app.is_superadmin() RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT coalesce(current_setting('app.is_superadmin', true) = 'on', false) $$;
  CREATE FUNCTION app.set_tenant(p_org text, p_super boolean DEFAULT false)
    RETURNS void LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM set_config('app.current_org_id', coalesce(p_org,''), true);
      PERFORM set_config('app.is_superadmin', CASE WHEN p_super THEN 'on' ELSE 'off' END, true);
    END $$;

  ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "Task" FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON "Task"
    USING (app.is_superadmin() OR "organizationId" = app.current_org())
    WITH CHECK (app.is_superadmin() OR "organizationId" = app.current_org());

  -- Rol de aplicación no-superusuario (RLS se aplica). Owner-bypass se evita con FORCE.
  CREATE ROLE projectos_app NOLOGIN;
  GRANT USAGE ON SCHEMA app TO projectos_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON "Organization", "Task" TO projectos_app;

  -- Datos sembrados como superusuario (sin restricción).
  INSERT INTO "Organization" VALUES ('org_A','Acme'), ('org_B','Globex');
  INSERT INTO "Task" VALUES ('t1','org_A','A-1'), ('t2','org_A','A-2'), ('t3','org_B','B-1');
`);

// A partir de aquí actuamos como la aplicación (rol sin privilegios de superusuario).
async function asTenant(org, opts = {}) {
  await db.exec('BEGIN');
  await db.exec('SET LOCAL ROLE projectos_app');
  await db.query('SELECT app.set_tenant($1, $2)', [org, !!opts.super]);
  const rows = (await db.query('SELECT id FROM "Task" ORDER BY id')).rows.map(r => r.id);
  let insertErr = null;
  if (opts.tryInsert) {
    try {
      await db.query('INSERT INTO "Task" VALUES ($1,$2,$3)', opts.tryInsert);
    } catch (e) { insertErr = e.message; }
  }
  await db.exec('ROLLBACK');
  return { rows, insertErr };
}

console.log('RLS — aislamiento por tenant:');
const a = await asTenant('org_A');
ok(JSON.stringify(a.rows) === JSON.stringify(['t1', 't2']), `org_A ve solo sus 2 tareas (vio ${a.rows.length})`);

const b = await asTenant('org_B');
ok(JSON.stringify(b.rows) === JSON.stringify(['t3']), `org_B ve solo su 1 tarea (vio ${b.rows.length})`);

const none = await asTenant('');
ok(none.rows.length === 0, `sin contexto de org → 0 filas (fail-closed) (vio ${none.rows.length})`);

const sa = await asTenant('', { super: true });
ok(sa.rows.length === 3, `super-admin ve las 3 tareas (vio ${sa.rows.length})`);

console.log('RLS — WITH CHECK en escritura:');
const crossInsert = await asTenant('org_A', { tryInsert: ['t9', 'org_B', 'cross'] });
ok(crossInsert.insertErr !== null, 'insertar tarea de org_B estando en org_A → RECHAZADO por WITH CHECK');

const validInsert = await asTenant('org_A', { tryInsert: ['t9', 'org_A', 'ok'] });
ok(validInsert.insertErr === null, 'insertar tarea de la propia org → permitido');

console.log(`\nResultado: ${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
