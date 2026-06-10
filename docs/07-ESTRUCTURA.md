# 7 · Estructura de carpetas (monorepo)

```
projectos/
├─ package.json                # pnpm workspaces
├─ pnpm-workspace.yaml
├─ turbo.json                  # pipeline build/test/lint
├─ docker-compose.yml          # postgres, redis, mailhog
├─ .github/workflows/ci.yml
│
├─ packages/
│  ├─ core/                    # DOMINIO PURO (sin framework) ✅
│  │  └─ src/
│  │     ├─ prioritization.ts  # Módulo 5
│  │     ├─ capacity.ts        # Módulo 7
│  │     ├─ timeboxing.ts      # Módulo 6
│  │     ├─ scheduling.ts      # Módulo 4 (CPM)
│  │     ├─ index.ts
│  │     └─ __tests__/core.test.ts
│  ├─ db/                      # Prisma client + schema + seeds + migrations
│  │  ├─ schema.prisma
│  │  └─ seed.ts
│  ├─ ui/                      # design system shadcn compartido
│  └─ config/                  # tsconfig, eslint, tailwind presets
│
├─ apps/
│  ├─ api/                     # NestJS
│  │  └─ src/
│  │     ├─ main.ts
│  │     ├─ app.module.ts
│  │     ├─ common/            # guards, interceptors, prisma middleware
│  │     ├─ iam/               # auth + RBAC (ability.factory.ts)
│  │     ├─ projects/          # controller·service·module·dto
│  │     ├─ tasks/
│  │     ├─ boards/
│  │     ├─ gantt/
│  │     ├─ timeboxing/        # usa packages/core
│  │     ├─ capacity/
│  │     ├─ okr/
│  │     ├─ documents/
│  │     ├─ reports/
│  │     ├─ notifications/
│  │     ├─ ai/                # OpenAI function-calling + RAG
│  │     ├─ realtime/          # Socket.IO gateway
│  │     └─ jobs/              # BullMQ processors
│  │
│  └─ web/                     # Next.js 15 App Router
│     ├─ app/
│     │  ├─ (auth)/login/
│     │  ├─ (app)/
│     │  │  ├─ dashboard/
│     │  │  ├─ projects/[id]/
│     │  │  │  ├─ board/
│     │  │  │  ├─ gantt/
│     │  │  │  ├─ docs/
│     │  │  │  └─ page.tsx
│     │  │  ├─ today/          # timeboxing "Mi día"
│     │  │  ├─ capacity/
│     │  │  ├─ okr/
│     │  │  └─ reports/
│     │  └─ api/               # route handlers (BFF)
│     ├─ components/           # KanbanBoard, GanttChart, CapacityHeatmap…
│     ├─ lib/                  # api client, query hooks, auth
│     ├─ stores/               # Zustand (UI state)
│     └─ styles/
│
├─ infra/
│  ├─ terraform/               # VPC, EKS, RDS, ElastiCache, S3
│  └─ k8s/                     # deployments, hpa, ingress
│
└─ docs/                       # esta especificación
```

## Convenciones

- **Dependencia unidireccional**: `apps/*` → `packages/*`. `packages/core` no
  importa nada del repo (cero deps de framework).
- **Cada módulo Nest** = `*.controller.ts`, `*.service.ts`, `*.module.ts`,
  `dto/`, `*.events.ts`. Lógica de cálculo delegada a `@projectos/core`.
- **DTOs validados** con `class-validator` + `zod` compartido con el frontend.
- **Feature folders** en `web/components/<feature>/`.
