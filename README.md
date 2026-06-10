# ProjectOS

Plataforma de gestión de proyectos, tareas, objetivos y productividad de equipos.
Kanban (Trello) + gestión (Asana) + todo-en-uno (ClickUp) + dependencias (Jira) +
timeboxing (Motion) + docs (Notion).

> Especificación técnica nivel startup, lista para desarrollo. No es un prototipo
> de juguete: incluye esquema de datos real, algoritmos verificados con tests y
> contratos de API.

> 📋 **¿Retomas el proyecto o eres una nueva sesión?** Empieza por
> **[docs/HANDOFF.md](docs/HANDOFF.md)** — documentación de traspaso completa
> (estado actual, modelo de datos del prototipo, deuda técnica, decisiones y
> próximos pasos priorizados). Es el mapa para continuar sin perder contexto.

## Estado de los entregables

| # | Entregable | Ubicación | Estado |
|---|-----------|-----------|--------|
| 1 | Arquitectura completa | [docs/01-ARQUITECTURA.md](docs/01-ARQUITECTURA.md) | ✅ |
| 2 | Modelo de base de datos | [prisma/schema.prisma](prisma/schema.prisma) | ✅ |
| 3 | Diagrama entidad-relación | [docs/02-MODELO-DATOS.md](docs/02-MODELO-DATOS.md) | ✅ |
| 4 | Wireframes | [docs/05-UX-WIREFRAMES.md](docs/05-UX-WIREFRAMES.md) | ✅ |
| 5 | Diseño UX/UI | [docs/05-UX-WIREFRAMES.md](docs/05-UX-WIREFRAMES.md) | ✅ |
| 6 | Roadmap de desarrollo | [docs/06-ROADMAP.md](docs/06-ROADMAP.md) | ✅ |
| 7 | Estructura de carpetas | [docs/07-ESTRUCTURA.md](docs/07-ESTRUCTURA.md) | ✅ |
| 8 | Código inicial funcional | [packages/core](packages/core), [apps](apps) | ✅ |
| 9 | API REST completa | [docs/03-API.md](docs/03-API.md) | ✅ |
| 10 | Sistema de permisos | [docs/04-RBAC.md](docs/04-RBAC.md) | ✅ |
| 11 | Timeboxing inteligente | [packages/core/src/timeboxing.ts](packages/core/src/timeboxing.ts) | ✅ |
| 12 | Algoritmo de priorización | [packages/core/src/prioritization.ts](packages/core/src/prioritization.ts) | ✅ |
| 13 | Algoritmo de capacidad | [packages/core/src/capacity.ts](packages/core/src/capacity.ts) | ✅ |
| 14 | Plan de escalamiento SaaS | [docs/08-SAAS.md](docs/08-SAAS.md) | ✅ |
| 15 | Seguridad RLS + Auth (correo/clave) | [docs/10-RLS-SEGURIDAD.md](docs/10-RLS-SEGURIDAD.md) | ✅ |
| 16 | Prototipo funcional (clon IMPA / Control de Gestión) | [prototype/projectos.html](prototype/projectos.html) | ✅ |
| 17 | 📋 Documentación de traspaso (handoff) | [docs/HANDOFF.md](docs/HANDOFF.md) | ✅ |
| 18 | 🚦 Informe de preparación para producción | [docs/PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md) | ✅ |

Extra: [Camino crítico / CPM (Gantt)](packages/core/src/scheduling.ts) ·
[IA de productividad](docs/09-IA.md) ·
[**Seguridad: RLS + Auth**](docs/10-RLS-SEGURIDAD.md)

## Despliegue (Netlify + Supabase) 🚀

Stack de producción listo para publicar y obtener **link público**:
**Netlify** (frontend Next.js) + **Supabase** (Postgres + Auth + Storage + Edge
Functions serverless). Guía paso a paso en **[DEPLOY.md](DEPLOY.md)**.

```
supabase/
  migrations/0001_init.sql   # esquema (20+ tablas, enums, índices)
  migrations/0002_rls.sql    # RLS multi-tenant + storage + triggers
  seed.sql · seed-admin.mjs  # administrador de cuentas
  functions/ai-assistant/    # Edge Function (Deno) — backend serverless
  rls.test.mjs               # prueba de aislamiento (5/5 ✓)
netlify.toml                 # build del frontend con plugin de Next.js
```

Verificación local del aislamiento (Postgres real vía PGlite):
```bash
npm run db:test-supabase     # 5/5 ✓
```

> Nota: el backend **NestJS** en `apps/api` queda como alternativa "API propia"
> (Docker/AWS, ver [08-SAAS.md](docs/08-SAAS.md)). El camino de despliegue por
> defecto es **Supabase serverless**.

## Seguridad de la información

- **Login por correo + contraseña** (bcrypt cost 12, JWT 15 min + refresh 30 d).
- **RLS multi-tenant en PostgreSQL** como defensa en profundidad: aunque la app
  olvide filtrar por organización, la BD rechaza filas de otro tenant.
  Verificado con un test real (PGlite) — **6/6** ✅.
- **Administrador de cuentas** (super-admin) sembrado:
  `admin@projectos.app` / `Admin#ProjectOS2026` (cambiar tras primer login).

```bash
pnpm --filter @projectos/db prisma migrate deploy   # tablas (rol owner)
pnpm --filter @projectos/db rls:apply               # políticas RLS
pnpm --filter @projectos/db seed                    # crea el admin
pnpm --filter @projectos/db test:rls                # prueba aislamiento (6/6)
```

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, TanStack Query, dnd-kit, Zustand |
| Backend | NestJS 10, Prisma, BullMQ (jobs), tRPC opcional sobre REST |
| Datos | PostgreSQL 16, Redis 7 (cache + colas + pub/sub) |
| Auth | Auth.js (NextAuth) + JWT de sesión, RBAC propio |
| IA | OpenAI API (function-calling) + pgvector para RAG |
| Realtime | WebSocket gateway (Socket.IO) sobre Redis adapter |
| Infra | Docker → Kubernetes (EKS) en AWS, Terraform IaC |

## Arranque local

```bash
# 1. Servicios base
docker compose up -d            # postgres + redis

# 2. Backend
cd apps/api
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev                        # http://localhost:4000

# 3. Frontend
cd apps/web
pnpm install
pnpm dev                        # http://localhost:3000

# 4. Tests de algoritmos núcleo
cd packages/core && pnpm test   # 7/7 ✅
```

## Monorepo

Gestionado con **pnpm workspaces + Turborepo**. El dominio puro
(`packages/core`) no depende de NestJS ni de Next: los algoritmos se testean
aislados y se reutilizan en backend y frontend.
