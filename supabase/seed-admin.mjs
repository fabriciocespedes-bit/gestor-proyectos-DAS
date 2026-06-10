/**
 * Crea el ADMINISTRADOR DE CUENTAS en Supabase (Auth + perfil super-admin +
 * organización + membership). Usa la Service Role Key (bypassa RLS).
 *
 * Uso:
 *   SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...  \
 *   ADMIN_EMAIL=admin@projectos.app  ADMIN_PASSWORD='Admin#ProjectOS2026'  \
 *   node supabase/seed-admin.mjs
 *
 * Requiere: npm i @supabase/supabase-js   (o ejecutar dentro de apps/web)
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.ADMIN_EMAIL ?? 'admin@projectos.app').toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? 'Admin#ProjectOS2026';
const name = process.env.ADMIN_NAME ?? 'Administrador de Cuentas';

if (!url || !serviceKey) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1) Crea (o recupera) el usuario en Supabase Auth, con email confirmado.
let { data: created, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name },
});
let userId = created?.user?.id;

if (error && /already.*registered|exists/i.test(error.message)) {
  const { data: list } = await admin.auth.admin.listUsers();
  userId = list.users.find((u) => u.email === email)?.id;
  console.log('Usuario ya existía, reutilizando.');
} else if (error) {
  console.error('Error creando usuario:', error.message);
  process.exit(1);
}

// El trigger handle_new_user ya creó el profile; lo marcamos super-admin.
await admin.from('profiles').update({ is_super_admin: true, name }).eq('id', userId);

// 2) Organización plataforma (idempotente por slug).
let { data: org } = await admin
  .from('organizations')
  .select('id')
  .eq('slug', 'projectos')
  .maybeSingle();
if (!org) {
  const { data } = await admin
    .from('organizations')
    .insert({ name: 'ProjectOS', slug: 'projectos', plan: 'ENTERPRISE', seats: 999 })
    .select('id')
    .single();
  org = data;
}

// 3) Membership OWNER (idempotente).
await admin
  .from('memberships')
  .upsert(
    { user_id: userId, organization_id: org.id, role: 'OWNER' },
    { onConflict: 'user_id,organization_id' },
  );

// 4) Etiquetas base.
await admin.from('labels').upsert(
  [
    { organization_id: org.id, name: 'Bug', color: '#ef4444' },
    { organization_id: org.id, name: 'Feature', color: '#6366f1' },
    { organization_id: org.id, name: 'UX', color: '#10b981' },
  ],
  { onConflict: 'organization_id,name' },
);

console.log('\n✅ Administrador de cuentas listo');
console.log('────────────────────────────────────');
console.log(`  Correo:      ${email}`);
console.log(`  Contraseña:  ${password}`);
console.log(`  Super-admin: sí`);
console.log(`  Organización: ProjectOS`);
console.log('────────────────────────────────────');
console.log('  ⚠ Cambia la contraseña tras el primer login.\n');
