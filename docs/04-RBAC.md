# 4 · Sistema de permisos (RBAC + ABAC con CASL)

## 4.1 Roles base (`OrgRole`)

| Rol | Alcance |
|-----|---------|
| **OWNER** | Todo. Facturación, borrar org, transferir propiedad. |
| **ADMIN** | Gestiona miembros, equipos, proyectos, settings. No facturación. |
| **MANAGER** | CRUD de sus proyectos/equipos, ve capacidad y reportes del equipo. |
| **MEMBER** | CRUD de tareas donde participa, ve proyectos donde es miembro. |
| **GUEST** | Solo lectura en proyectos compartidos explícitamente. |

El rol da el **baseline**; CASL refina por recurso (ABAC: atributos como
`project.ownerId`, `task.assigneeId`, membresía al equipo).

## 4.2 Matriz acción × rol (resumen)

| Recurso / Acción | OWNER | ADMIN | MANAGER | MEMBER | GUEST |
|------------------|:----:|:----:|:------:|:-----:|:----:|
| Org settings / billing | ✔ | ✖ | ✖ | ✖ | ✖ |
| Invitar/quitar miembros | ✔ | ✔ | ✖ | ✖ | ✖ |
| Crear proyecto | ✔ | ✔ | ✔ | ✖ | ✖ |
| Editar proyecto | ✔ | ✔ | dueño/equipo | ✖ | ✖ |
| Crear/mover tarea | ✔ | ✔ | ✔ | en sus proyectos | ✖ |
| Editar tarea | ✔ | ✔ | ✔ | asignado/reporter | ✖ |
| Comentar | ✔ | ✔ | ✔ | ✔ | ✖ |
| Ver reportes equipo | ✔ | ✔ | ✔ | propios | ✖ |
| Ver proyecto | ✔ | ✔ | miembro | miembro | compartido |
| Editar OKR | ✔ | ✔ | ✔ | ✖ | ✖ |

## 4.3 Definición CASL (backend)

```ts
// apps/api/src/iam/ability.factory.ts
import { AbilityBuilder, createMongoAbility } from '@casl/ability';

export function defineAbilityFor(ctx: {
  userId: string; orgId: string; role: OrgRole; teamIds: string[];
}) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (ctx.role === 'OWNER') { can('manage', 'all'); return build(); }

  if (ctx.role === 'ADMIN') {
    can('manage', ['Project', 'Task', 'Team', 'Objective', 'Document']);
    can('read', 'Report');
    cannot('manage', 'Billing');
  }

  if (ctx.role === 'MANAGER') {
    can('create', 'Project');
    can(['read', 'update'], 'Project', { teamId: { $in: ctx.teamIds } });
    can('manage', 'Task', { 'project.teamId': { $in: ctx.teamIds } });
    can('read', 'Report', { teamId: { $in: ctx.teamIds } });
  }

  if (ctx.role === 'MEMBER') {
    can('read', 'Project', { 'members.userId': ctx.userId });
    can('create', 'Task', { 'project.members.userId': ctx.userId });
    can('update', 'Task', { assigneeId: ctx.userId });
    can('update', 'Task', { reporterId: ctx.userId });
    can(['read', 'create'], 'Comment');
  }

  if (ctx.role === 'GUEST') {
    can('read', 'Project', { sharedWith: { $in: [ctx.userId] } });
  }

  // Regla transversal: nunca cruzar tenants
  cannot('manage', 'all', { organizationId: { $ne: ctx.orgId } });
  return build();
}
```

## 4.4 Enforcement (3 capas)

1. **Guard de ruta** (`@UseGuards(PoliciesGuard)`) — verifica `can(action, subject)`
   antes de ejecutar el handler.
2. **Query scoping** — `PrismaTenantMiddleware` añade `organizationId` y filtros
   de visibilidad a toda lectura (no se confía solo en el guard).
3. **PostgreSQL RLS** — política `USING (organization_id = current_setting('app.org_id'))`
   como red de seguridad si una query se cuela sin middleware.

## 4.5 Frontend
`@casl/react` con `<Can I="update" this={task}>` para ocultar/inhabilitar UI.
La UI es conveniencia; la autoridad siempre es el backend.
