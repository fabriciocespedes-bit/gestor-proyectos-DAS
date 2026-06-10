/**
 * Seed — crea la organización plataforma y el ADMINISTRADOR DE CUENTAS
 * (super-admin) con login por correo + contraseña.
 *
 * Ejecutar:  pnpm prisma db seed
 * Credenciales por defecto (sobrescribibles por entorno):
 *   ADMIN_EMAIL     (def. admin@projectos.app)
 *   ADMIN_PASSWORD  (def. Admin#ProjectOS2026)
 *   ADMIN_NAME      (def. Administrador de Cuentas)
 *
 * El seed corre como el rol dueño de la BD (bypassa RLS); es el único punto
 * donde se crea el primer usuario sin contexto de tenant.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@projectos.app').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'Admin#ProjectOS2026';
  const name = process.env.ADMIN_NAME ?? 'Administrador de Cuentas';

  const passwordHash = await bcrypt.hash(password, 12);

  // 1) Organización plataforma (tenant raíz del administrador).
  const org = await prisma.organization.upsert({
    where: { slug: 'projectos' },
    update: {},
    create: {
      name: 'ProjectOS',
      slug: 'projectos',
      plan: 'ENTERPRISE',
      seats: 999,
    },
  });

  // 2) Usuario administrador de cuentas (super-admin) + membership OWNER.
  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isSuperAdmin: true, name },
    create: {
      email,
      name,
      passwordHash,
      isSuperAdmin: true,
      emailVerified: new Date(),
      memberships: {
        create: { organizationId: org.id, role: 'OWNER' },
      },
    },
  });

  // 3) Etiquetas base de la organización (conveniencia).
  await prisma.label.createMany({
    data: [
      { organizationId: org.id, name: 'Bug', color: '#ef4444' },
      { organizationId: org.id, name: 'Feature', color: '#6366f1' },
      { organizationId: org.id, name: 'UX', color: '#10b981' },
    ],
    skipDuplicates: true,
  });

  console.log('\n✅ Seed completado');
  console.log('────────────────────────────────────────');
  console.log(' Administrador de cuentas creado:');
  console.log(`   Correo:      ${admin.email}`);
  console.log(`   Contraseña:  ${password}`);
  console.log(`   Super-admin: sí (bypassa RLS)`);
  console.log(`   Organización: ${org.name} (${org.slug})`);
  console.log('────────────────────────────────────────');
  console.log(' ⚠ Cambia la contraseña tras el primer login.');
  console.log(' ⚠ En producción define ADMIN_PASSWORD como secreto, no uses el default.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
