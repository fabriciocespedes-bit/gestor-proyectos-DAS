import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import type { JwtPayload } from './jwt.guard';

export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type Subject =
  | 'Project'
  | 'Task'
  | 'Team'
  | 'Objective'
  | 'Document'
  | 'Report'
  | 'Comment'
  | 'Billing'
  | 'all';

export type AppAbility = MongoAbility<[Action, Subject]>;

/**
 * Construye la habilidad CASL a partir del JWT. El rol da el baseline; las
 * condiciones (ABAC) refinan por recurso. Ver docs/04-RBAC.md.
 */
@Injectable()
export class AbilityFactory {
  forUser(user: JwtPayload): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility,
    );

    if (user.isSuperAdmin || user.role === 'OWNER') {
      can('manage', 'all');
      if (!user.isSuperAdmin && user.role === 'OWNER') {
        // OWNER gestiona su org pero la facturación es aparte si así se define
      }
      return build();
    }

    switch (user.role) {
      case 'ADMIN':
        can('manage', ['Project', 'Task', 'Team', 'Objective', 'Document']);
        can('read', 'Report');
        cannot('manage', 'Billing');
        break;

      case 'MANAGER':
        can('create', 'Project');
        can(['read', 'update'], 'Project');
        can('manage', 'Task');
        can('manage', 'Objective');
        can('read', 'Report');
        break;

      case 'MEMBER':
        can('read', 'Project');
        can(['create', 'update'], 'Task', { assigneeId: user.sub } as any);
        can(['create', 'update'], 'Task', { reporterId: user.sub } as any);
        can('read', 'Task');
        can(['read', 'create'], 'Comment');
        break;

      case 'GUEST':
      default:
        can('read', 'Project');
        break;
    }

    return build();
  }
}
