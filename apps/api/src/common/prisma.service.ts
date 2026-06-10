import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import {
  appPrisma,
  tenantClient,
  withTenant,
  type TenantContext,
  type TenantPrisma,
} from '@projectos/db';

/**
 * Prisma REQUEST-SCOPED ligado al tenant del usuario autenticado.
 * `JwtAuthGuard` deja el contexto en `req.tenant`. Todo acceso a datos pasa por
 * `db`, que aplica RLS automáticamente (una transacción con app.set_tenant por op).
 *
 * Los servicios usan `this.prisma.db.task.findMany(...)` exactamente igual que
 * un PrismaClient normal — la seguridad es transparente.
 */
@Injectable({ scope: Scope.REQUEST })
export class PrismaService {
  readonly db: TenantPrisma;
  private readonly ctx: TenantContext;

  constructor(@Inject(REQUEST) req: Request & { tenant?: TenantContext }) {
    if (!req.tenant) {
      throw new Error('PrismaService usado sin contexto de tenant (¿falta JwtAuthGuard?)');
    }
    this.ctx = req.tenant;
    this.db = tenantClient(appPrisma, this.ctx);
  }

  /** Organización activa de la petición (para estampar organizationId al crear). */
  get orgId(): string {
    return this.ctx.orgId;
  }

  /** Usuario autenticado de la petición. */
  get userId(): string {
    return this.ctx.userId;
  }

  /** Para atomicidad multi-operación o SQL crudo bajo el mismo contexto RLS. */
  tx<T>(fn: Parameters<typeof withTenant>[2]) {
    return withTenant(appPrisma, this.ctx, fn) as Promise<T>;
  }
}
