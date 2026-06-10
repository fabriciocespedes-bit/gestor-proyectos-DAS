import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import type { TenantContext } from '@projectos/db';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  orgId: string;
  role: string;
  isSuperAdmin?: boolean;
}

/**
 * Valida el JWT y deja en la request:
 *  - req.user   → payload completo (para RBAC/CASL)
 *  - req.tenant → contexto de seguridad que consume PrismaService (RLS)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<
      Request & { user?: JwtPayload; tenant?: TenantContext }
    >();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(header.slice(7), {
        secret: process.env.JWT_SECRET,
      });
      // Soporte multi-org: el header puede seleccionar otra org del usuario.
      const orgId = (req.headers['x-org-id'] as string) || payload.orgId;

      req.user = payload;
      req.tenant = {
        orgId,
        userId: payload.sub,
        isSuperAdmin: payload.isSuperAdmin ?? false,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
