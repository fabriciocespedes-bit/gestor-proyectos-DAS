# 1 · Arquitectura

## 1.1 Vista de alto nivel

```
                         ┌─────────────────────────────┐
                         │        Cliente (Web)        │
                         │  Next.js 15 · App Router    │
                         │  RSC + Client Islands       │
                         └──────────┬──────────────────┘
                                    │ HTTPS / WSS
              ┌─────────────────────┼──────────────────────┐
              │                     │                      │
      ┌───────▼───────┐    ┌────────▼────────┐    ┌────────▼────────┐
      │  API Gateway  │    │  WS Gateway     │    │  BFF / Edge     │
      │  (NestJS)     │    │  (Socket.IO)    │    │  Next route     │
      │  REST + tRPC  │    │  realtime board │    │  handlers       │
      └───┬───────────┘    └────────┬────────┘    └─────────────────┘
          │  Guards (Auth+RBAC)     │ Redis adapter (pub/sub)
          │                         │
   ┌──────┴────────────────────────┴───────────────────────────┐
   │                     Capa de aplicación (NestJS modules)     │
   │  Projects · Tasks · Boards · Gantt · Timeboxing · Capacity  │
   │  OKR · Docs · Reports · Notifications · AI · IAM            │
   └──────┬───────────────────┬──────────────┬──────────────────┘
          │                   │              │
   ┌──────▼──────┐     ┌──────▼──────┐  ┌────▼──────────┐
   │ PostgreSQL  │     │   Redis     │  │  BullMQ jobs  │
   │  (Prisma)   │     │ cache/locks │  │ timebox·notif │
   │  pgvector   │     │ pub/sub     │  │ reports·AI    │
   └─────────────┘     └─────────────┘  └───────────────┘
                                              │
                                        ┌─────▼──────┐
                                        │ OpenAI API │
                                        │ S3 (files) │
                                        │ Email/Slack│
                                        └────────────┘
```

## 1.2 Principios

1. **Dominio puro aislado** (`packages/core`): priorización, capacidad,
   timeboxing y CPM son funciones puras sin I/O. Se testean solas y se ejecutan
   tanto en backend (persistencia) como en frontend (previews optimistas).
2. **Multi-tenant por fila**: cada tabla relevante lleva `organizationId`. Un
   `PrismaTenantMiddleware` inyecta el filtro en cada query; RLS de PostgreSQL
   como segunda barrera (defensa en profundidad).
3. **Escrituras event-driven**: cada mutación emite un evento de dominio
   (`task.moved`, `task.estimated`) que dispara: recálculo de score, re-timeboxing,
   notificaciones y push WebSocket. Desacopla el camino crítico de la request.
4. **Optimistic UI**: el board aplica el cambio local con `dnd-kit` + TanStack
   Query mutation, y reconcilia con el evento WS. Latencia percibida ~0.

## 1.3 Flujo de una acción (mover tarjeta en Kanban)

```
1. UI: drag&drop → mutation optimista (reordena local con order fraccional)
2. PATCH /tasks/:id  { columnId, order }
3. NestJS TasksService:
   a. valida permiso (CASL: can('update', task))
   b. persiste (Prisma) en transacción
   c. emite evento task.moved
4. Listeners (async, BullMQ):
   - PriorityListener → recomputePriorityScore
   - TimeboxListener  → si cambió a TODAY, re-genera timeboxes
   - ActivityListener → Activity row
   - NotifyListener   → ¿desbloquea dependientes? notifica
5. WS Gateway publica board:<projectId> → otros clientes actualizan
```

## 1.4 Modos de despliegue

- **Dev**: `docker-compose` (postgres, redis, api, web, mailhog).
- **Prod**: Kubernetes (EKS). Deployments separados para `api`, `ws`, `worker`
  (consumidores BullMQ), `web`. HPA por CPU + longitud de cola. Ver
  [08-SAAS.md](08-SAAS.md).

## 1.5 Seguridad transversal

- Auth.js (OAuth Google/Microsoft + email magic link) → JWT corto + refresh.
- RBAC con CASL ([04-RBAC.md](04-RBAC.md)).
- Rate limiting por org (Redis token bucket).
- Auditoría: tabla `Activity` + logs estructurados (pino) a CloudWatch.
- Secrets en AWS Secrets Manager; nada en el repo.
- Cifrado en reposo (RDS/EBS) y en tránsito (TLS 1.3).
