import { Prisma, PrismaClient } from '@prisma/client';

/** Contexto de seguridad de la petición, derivado del JWT. */
export interface TenantContext {
  orgId: string;
  userId: string;
  isSuperAdmin?: boolean;
}

/**
 * Fija el contexto del tenant en la transacción actual con SET LOCAL semantics.
 * DEBE ejecutarse dentro de una transacción para que `is_local=true` lo limite a
 * esa conexión (evita fugas entre peticiones por el pool de conexiones).
 */
export function setTenantOnTx(
  tx: Prisma.TransactionClient,
  ctx: TenantContext,
) {
  return tx.$executeRaw`SELECT app.set_tenant(${ctx.orgId}, ${ctx.userId}, ${
    ctx.isSuperAdmin ?? false
  })`;
}

/**
 * Ejecuta `fn` dentro de una transacción con el contexto RLS aplicado.
 * Úsalo cuando necesites atomicidad multi-operación o SQL crudo.
 */
export async function withTenant<T>(
  prisma: PrismaClient,
  ctx: TenantContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await setTenantOnTx(tx, ctx);
    return fn(tx);
  });
}

/**
 * Extensión de Prisma que envuelve CADA operación de modelo en su propia
 * transacción con el contexto del tenant. Ideal para el cliente request-scoped:
 * los servicios usan `tenantPrisma.task.findMany(...)` sin pensar en RLS.
 *
 * Nota: cada llamada = una transacción. Para atomicidad entre varias
 * operaciones, usa `withTenant(...)` explícitamente.
 */
export function tenantClient(base: PrismaClient, ctx: TenantContext) {
  return base.$extends({
    name: 'rls-tenant',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args }) {
          return base.$transaction(async (tx) => {
            await setTenantOnTx(tx, ctx);
            // re-despacha la misma operación sobre el cliente transaccional
            return (tx as any)[lowerFirst(model)][operation](args);
          });
        },
      },
    },
  });
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export type TenantPrisma = ReturnType<typeof tenantClient>;
