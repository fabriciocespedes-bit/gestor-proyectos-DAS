import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AbilityFactory, AppAbility } from './ability.factory';
import type { JwtPayload } from './jwt.guard';

export type PolicyHandler = (ability: AppAbility) => boolean;

export const CHECK_POLICIES = 'check_policies';
/** Decorador: @CheckPolicies((a) => a.can('update', 'Task')) */
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES, handlers);

/**
 * Evalúa las políticas CASL declaradas en el handler contra la habilidad del
 * usuario autenticado. Debe ejecutarse DESPUÉS de JwtAuthGuard.
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const handlers =
      this.reflector.get<PolicyHandler[]>(CHECK_POLICIES, ctx.getHandler()) ??
      [];
    if (handlers.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (!req.user) throw new ForbiddenException();

    const ability = this.abilityFactory.forUser(req.user);
    const allowed = handlers.every((h) => h(ability));
    if (!allowed) throw new ForbiddenException('No autorizado para esta acción');
    return true;
  }
}
