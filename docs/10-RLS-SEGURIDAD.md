# 10 · Seguridad de la información: RLS + Autenticación

Aislamiento multi-tenant garantizado en **dos capas independientes**:

1. **Aplicación** — `PrismaTenantMiddleware` + CASL filtran por `organizationId`.
2. **Base de datos (RLS)** — PostgreSQL rechaza filas de otro tenant aunque la
   capa 1 falle. **Esta es la red de seguridad real.** Verificada con tests.

> Modelo de amenaza que cubre RLS: bug en un `where`, inyección que omite el
> filtro de la app, query cruda mal escrita, o un endpoint nuevo que olvida
> aplicar el scoping. En todos esos casos la BD sigue devolviendo 0 filas ajenas.

## 10.1 Cómo funciona

- Cada tabla de tenant lleva `organizationId` (denormalizado para que la política
  sea un comparador directo, sin JOINs por fila → rápido). Ver
  [02-MODELO-DATOS](02-MODELO-DATOS.md).
- Migración [prisma/migrations/20260609_rls/migration.sql](../prisma/migrations/20260609_rls/migration.sql):
  - `ENABLE` **+ `FORCE ROW LEVEL SECURITY`** en cada tabla. `FORCE` es clave:
    sin él, el dueño de la tabla (que Prisma usa) saltaría las políticas.
  - Política `tenant_isolation`:
    `USING (is_superadmin() OR "organizationId" = current_org())`
    con el mismo `WITH CHECK` para bloquear escrituras cruzadas.
  - Contexto por transacción vía `app.set_tenant(org, user, super)` →
    `set_config(..., is_local := true)` (semántica `SET LOCAL`).

### Fail-closed
Si no hay contexto (`app.current_org_id` vacío) la comparación es contra `NULL`
→ **0 filas**. Nunca "ver todo por defecto".

## 10.2 Roles de base de datos

| Rol | RLS | Uso |
|-----|-----|-----|
| `projectos_app` | **enforced** | Runtime de toda la app (`DATABASE_URL`) |
| `projectos_auth` | **BYPASSRLS** | Solo login/registro (`AUTH_DATABASE_URL`): buscar usuario por email antes de existir contexto de org |
| `projectos` (owner) | bypass (superuser) | Solo migraciones/seed (`MIGRATE_DATABASE_URL`) |

El runtime **nunca** usa el rol superusuario: los superusuarios ignoran RLS.

## 10.3 Integración en la app

- [packages/db/src/tenant.ts](../packages/db/src/tenant.ts) — `withTenant()` y
  `tenantClient()`: cada operación corre en una transacción que primero fija el
  contexto. Por el pool de conexiones, **debe** ser `SET LOCAL` dentro de la tx.
- [apps/api/src/iam/jwt.guard.ts](../apps/api/src/iam/jwt.guard.ts) — del JWT
  saca `{ orgId, userId, isSuperAdmin }` y lo deja en `req.tenant`.
- [apps/api/src/common/prisma.service.ts](../apps/api/src/common/prisma.service.ts)
  — request-scoped: `this.prisma.db.task.findMany(...)` ya viene con RLS aplicado;
  el desarrollador no puede "olvidar" el tenant.

```
JWT → JwtAuthGuard → req.tenant → PrismaService(db) → tx { app.set_tenant() ; query }
                                                         └ RLS evalúa la política
```

## 10.4 Verificación (test real, no teoría)

[prisma/rls.isolation.test.mjs](../prisma/rls.isolation.test.mjs) corre PostgreSQL
real (PGlite/WASM), aplica las mismas políticas y comprueba **6/6**:

```
RLS — aislamiento por tenant:
  ✓ org_A ve solo sus 2 tareas
  ✓ org_B ve solo su 1 tarea
  ✓ sin contexto de org → 0 filas (fail-closed)
  ✓ super-admin ve las 3 tareas
RLS — WITH CHECK en escritura:
  ✓ insertar tarea de org_B estando en org_A → RECHAZADO
  ✓ insertar tarea de la propia org → permitido
```
`pnpm --filter @projectos/db test:rls`

## 10.5 Autenticación: correo + contraseña

- **Contraseñas**: bcrypt cost 12 ([password.ts](../apps/api/src/iam/password.ts)).
  Nunca en claro. Política mínima: ≥10 chars, mayús/minús/número.
- **Login** ([auth.service.ts](../apps/api/src/iam/auth.service.ts)):
  `POST /v1/auth/login { email, password }` → `accessToken` (15 min) + `refreshToken` (30 d).
  - Comparación de hash en **tiempo constante** incluso si el email no existe
    (anti-enumeración de usuarios).
  - Usa `authPrisma` (BYPASSRLS) porque aún no hay contexto de org.
- **Registro/invitación**: `POST /v1/auth/register` crea usuario + membership.
- **JWT payload**: `{ sub, email, orgId, role, isSuperAdmin }`. El `orgId` alimenta
  directamente el contexto RLS. Header `X-Org-Id` permite cambiar de org (multi-org).
- Capas adicionales recomendadas: rate-limit por IP/email en `/login`, bloqueo
  tras N intentos, 2FA (TOTP) para `OWNER`/super-admin, rotación de refresh tokens.

## 10.6 Administrador de cuentas (super-admin)

El [seed](../prisma/seed.ts) crea el primer **administrador de cuentas**:

| Campo | Valor por defecto (configurable por entorno) |
|-------|----------------------------------------------|
| Correo | `admin@projectos.app` (`ADMIN_EMAIL`) |
| Contraseña | `Admin#ProjectOS2026` (`ADMIN_PASSWORD`) |
| `isSuperAdmin` | `true` → **bypassa RLS** a nivel plataforma |
| Organización | `ProjectOS` (plan ENTERPRISE), rol `OWNER` |

```bash
pnpm --filter @projectos/db prisma migrate deploy   # crea tablas (rol owner)
pnpm --filter @projectos/db rls:apply               # aplica políticas RLS
pnpm --filter @projectos/db seed                    # crea el admin
```

> ⚠ Cambiar la contraseña tras el primer login. En producción `ADMIN_PASSWORD`
> debe venir de Secrets Manager, nunca del default. `isSuperAdmin` es poder total:
> reservarlo a operadores de la plataforma, auditando cada acción en `Activity`.
