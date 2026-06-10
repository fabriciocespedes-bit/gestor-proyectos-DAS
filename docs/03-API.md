# 3 · API REST

Base: `https://api.projectos.app/v1` · Auth: `Authorization: Bearer <jwt>` ·
Tenant: resuelto del JWT (`orgId`) o header `X-Org-Id` para usuarios multi-org.

Convenciones: JSON, `camelCase`, paginación cursor (`?cursor=&limit=`),
errores RFC-7807 (`{ type, title, status, detail }`), idempotencia en POST con
`Idempotency-Key`.

## 3.1 Auth & sesión
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Email magic link / OAuth callback |
| POST | `/auth/refresh` | Renueva JWT |
| GET | `/me` | Perfil + memberships |
| PATCH | `/me` | `weeklyHours`, `timezone`, `workingHours` |

## 3.2 Organizaciones / equipos
| Método | Ruta |
|--------|------|
| GET/POST | `/orgs`, `/orgs/:id` |
| GET/POST | `/orgs/:id/members` · `PATCH /members/:id` (rol) |
| GET/POST | `/teams` · `/teams/:id/members` |

## 3.3 Proyectos
| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/projects` | filtros `?status=&priority=&teamId=` |
| POST | `/projects` | crea columnas Kanban por defecto |
| GET | `/projects/:id` | incluye `riskScore`, milestones |
| PATCH | `/projects/:id` | cambia estado/prioridad |
| DELETE | `/projects/:id` | soft-delete |
| GET | `/projects/:id/board` | columnas + tareas ordenadas |
| GET | `/projects/:id/gantt` | nodos CPM + camino crítico |

## 3.4 Tareas
| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/tasks` | `?projectId=&assigneeId=&status=&dueBefore=&sort=priorityScore` |
| POST | `/tasks` | asigna `number` secuencial; calcula `priorityScore` |
| GET | `/tasks/:id` | full: checklist, comments, deps, blocks |
| PATCH | `/tasks/:id` | mover (`columnId`,`order`), estimar, asignar |
| DELETE | `/tasks/:id` | soft-delete |
| POST | `/tasks/:id/dependencies` | `{ blockingId, type }` → 409 si crea ciclo |
| DELETE | `/tasks/:id/dependencies/:depId` | |
| POST | `/tasks/:id/checklist` · `/comments` · `/attachments` | |
| POST | `/tasks/:id/recompute-priority` | fuerza recálculo |

### Ejemplo — mover tarjeta
```http
PATCH /v1/tasks/ckv9.. HTTP/1.1
Content-Type: application/json

{ "columnId": "col_today", "order": 1024.5, "status": "TODAY" }
```
```json
200 OK
{ "id":"ckv9..","status":"TODAY","priorityScore":82,"band":"CRITICAL",
  "timeboxRegenerated": true }
```

## 3.5 Timeboxing
| Método | Ruta | Body / Notas |
|--------|------|------|
| POST | `/tasks/:id/timeboxes:generate` | `{ from, maxBlockHours? }` → bloques propuestos (no persiste hasta confirmar) |
| POST | `/tasks/:id/timeboxes` | confirma/crea bloques |
| GET | `/users/:id/calendar?from=&to=` | bloques + reservas para la agenda |
| POST | `/timeboxes/:id:reschedule` | reagenda un bloque, detecta colisión |

## 3.6 Capacidad
| Método | Ruta |
|--------|------|
| GET | `/capacity?teamId=&from=&to=` | por persona: disponibles, asignadas, %ocupación, flag, burnoutRisk |
| GET | `/capacity/team/:teamId/heatmap?from=&to=` | matriz persona×semana |

## 3.7 OKR
| Método | Ruta |
|--------|------|
| GET/POST | `/objectives` · `/objectives/:id/key-results` |
| PATCH | `/key-results/:id` | `currentValue` → recalcula `progress` |
| POST | `/key-results/:id/link` | vincula proyecto o tarea |

## 3.8 Documentación
| Método | Ruta |
|--------|------|
| GET/POST | `/projects/:id/docs` · `/docs/:id` (PATCH content) |
| GET | `/docs/:id/history` | versiones |

## 3.9 Reportes
| Método | Ruta | Devuelve |
|--------|------|----------|
| GET | `/reports/burndown?projectId=&sprint=` | serie ideal vs real |
| GET | `/reports/velocity?teamId=` | puntos/sprint |
| GET | `/reports/cycle-time?projectId=` | lead & cycle time |
| GET | `/reports/capacity-usage?teamId=` | uso histórico |
| POST | `/reports/:type/export` | `{ format: pdf\|xlsx\|pptx }` → job → URL S3 |

## 3.10 IA
| Método | Ruta | Body |
|--------|------|------|
| POST | `/ai/ask` | `{ question }` → respuesta + acciones sugeridas (function-calling) |
| POST | `/ai/plan-week` | `{ userId }` → propuesta de timeboxes de la semana |
| POST | `/ai/summarize` | `{ docId \| meetingText }` |
| GET | `/ai/risks?projectId=` | riesgos detectados + razón |

## 3.11 Notificaciones / Webhooks
| Método | Ruta |
|--------|------|
| GET | `/notifications` · `POST /notifications/:id/read` |
| POST | `/webhooks` | suscribe eventos (Slack/Teams/WhatsApp via provider) |

## 3.12 Realtime (WebSocket)
`wss://api.projectos.app/ws` — canales: `board:<projectId>`,
`user:<userId>`, `project:<projectId>`. Eventos: `task.created|moved|updated`,
`timeblock.generated`, `capacity.overload`, `notification.new`.
