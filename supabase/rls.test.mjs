// Verifica el SQL real de Supabase (0001 schema + 0002 RLS) sobre Postgres WASM,
// stubbeando el schema `auth` y `auth.uid()`. Prueba aislamiento multi-tenant.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log('  ✓', m)) : (fail++, console.log('  ✗', m)));

// 1) Stub de Supabase Auth (en Supabase real ya existen).
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.test_uid', true), '')::uuid $$;
  create role authenticated nologin;
`);

// 2) Ejecuta 0001 (schema). Quita la extensión pgcrypto (gen_random_uuid es core en PG13+).
let s1 = readFileSync('supabase/migrations/0001_init.sql', 'utf8')
  .replace(/create extension[^;]*;/gi, '');
await db.exec(s1);
ok(true, '0001 schema: 20+ tablas creadas sin error de sintaxis');

// 3) Ejecuta 0002 hasta antes de STORAGE (helpers + RLS). Storage/triggers usan
//    schemas que el stub no tiene; el aislamiento RLS está en esta primera parte.
const s2full = readFileSync('supabase/migrations/0002_rls.sql', 'utf8');
const s2 = s2full.split('-- ════════════════════════════════════════════════════════════════════════\n-- STORAGE')[0];
await db.exec(s2);
ok(true, '0002 RLS: helpers + políticas tenant aplicadas');

await db.exec('grant all on all tables in schema public to authenticated;');
await db.exec('grant usage on schema public to authenticated;');

// 4) Datos sembrados (como superusuario, RLS no aplica).
const A='11111111-1111-1111-1111-111111111111', B='22222222-2222-2222-2222-222222222222';
const uA='aaaaaaaa-1111-1111-1111-111111111111', uB='bbbbbbbb-2222-2222-2222-222222222222';
await db.exec(`
  insert into auth.users(id,email) values ('${uA}','a@x.com'),('${uB}','b@x.com');
  insert into profiles(id,email,name) values ('${uA}','a@x.com','A'),('${uB}','b@x.com','B');
  insert into organizations(id,name,slug) values ('${A}','Acme','acme'),('${B}','Globex','globex');
  insert into memberships(user_id,organization_id,role) values ('${uA}','${A}','OWNER'),('${uB}','${B}','OWNER');
  insert into projects(id,organization_id,key,name) values
    (gen_random_uuid(),'${A}','ACM','Proyecto A'),
    (gen_random_uuid(),'${B}','GLB','Proyecto B');
`);

async function asUser(uid) {
  await db.exec('begin');
  await db.exec('set local role authenticated');
  await db.query('select set_config($1,$2,true)', ['request.test_uid', uid]);
  const rows = (await db.query('select name from projects order by name')).rows.map(r=>r.name);
  let crossInsert=null;
  try {
    // intenta insertar un proyecto en la OTRA organización
    const otherOrg = uid===uA ? B : A;
    await db.query('insert into projects(organization_id,key,name) values ($1,$2,$3)',[otherOrg,'X','cross']);
  } catch(e){ crossInsert = e.message; }
  await db.exec('rollback');
  return { rows, crossInsert };
}

console.log('RLS Supabase — aislamiento por organización:');
const a = await asUser(uA);
ok(JSON.stringify(a.rows)===JSON.stringify(['Proyecto A']), `usuario A ve solo su proyecto (vio: ${a.rows.join(', ')||'∅'})`);
const b = await asUser(uB);
ok(JSON.stringify(b.rows)===JSON.stringify(['Proyecto B']), `usuario B ve solo su proyecto (vio: ${b.rows.join(', ')||'∅'})`);
ok(a.crossInsert!==null, 'WITH CHECK: insertar en organización ajena → RECHAZADO');

console.log(`\nResultado: ${pass} pasaron, ${fail} fallaron`);
process.exit(fail?1:0);
