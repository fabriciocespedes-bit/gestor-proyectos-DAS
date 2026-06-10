# 8 · Plan de escalamiento SaaS

## 8.1 Planes y monetización

| Plan | Precio/usuario/mes | Límites | Diferenciadores |
|------|-------------------|---------|-----------------|
| **Free** | $0 | 5 usuarios, 3 proyectos, 100 MB | Kanban, prioridad, 1 dashboard |
| **Team** | $9 | ilimitado proyectos, 10 GB | Timeboxing, capacidad, Gantt |
| **Business** | $18 | 100 GB, SSO básico | IA (cuota), reportes avanzados, OKR |
| **Enterprise** | a medida | dedicado | SAML, RLS por org dedicada, SLA 99.9%, audit log, on-prem opcional |

Facturación: **Stripe** (suscripción por asiento + add-on de créditos IA).
Metering de IA por tokens vía evento → tabla `AiUsage`.

## 8.2 Arquitectura de escala

```
Route53 → CloudFront → ALB → EKS
                              ├─ web (Next, HPA cpu)
                              ├─ api (Nest REST, HPA cpu+rps)
                              ├─ ws  (Socket.IO, sticky/Redis adapter)
                              └─ worker (BullMQ, HPA por longitud de cola)
RDS Postgres (Multi-AZ) + read replicas
ElastiCache Redis (cluster mode) — cache, colas, pub/sub, locks
S3 (archivos) · OpenSearch (logs) · pgvector (RAG)
```

### Estrategia multi-tenant por etapa
1. **0–10k orgs**: pool único, aislamiento por `organizationId` + RLS.
2. **10k–100k**: sharding por hash de `organizationId` (Citus o particionado
   lógico); read replicas para dashboards/reportes.
3. **Enterprise**: tenant dedicado (esquema o cluster aparte) bajo demanda.

## 8.3 Rendimiento y costes

- **Cache en capas**: Redis (queries calientes: board, capacidad) con
  invalidación por evento; `stale-while-revalidate` en RSC.
- **Reportes pesados** → jobs asíncronos + materialized views refrescadas por cron.
- **IA** → cola dedicada, rate-limit por plan, caché de respuestas por hash de
  prompt+contexto, modelos por tier (mini para clasificación, full para planes).
- **N+1** eliminado con `prisma` `include` selectivos + DataLoader en GraphQL/tRPC.

## 8.4 Fiabilidad

- SLO 99.9% (Business+). Error budget gestionado.
- Multi-AZ RDS, backups PITR, snapshots diarios, prueba de restore mensual.
- Despliegue **blue-green** + migraciones expand/contract (sin downtime).
- Feature flags (Unleash/LaunchDarkly) para rollouts graduales.
- DR: replica cross-region (Enterprise), RPO 5 min / RTO 1 h.

## 8.5 Observabilidad

- **OpenTelemetry** (trazas), métricas Prometheus, dashboards Grafana.
- Logs estructurados (pino) → OpenSearch. Alertas en PagerDuty.
- KPIs de producto: activación, retención, uso de IA, ocupación media.

## 8.6 Seguridad y cumplimiento

- SOC 2 Type II (objetivo año 1), GDPR/LOPD: export & borrado de datos,
  residencia (EU región opcional).
- Pentest anual, SAST/DAST en CI, dependabot.
- RBAC + audit log inmutable (`Activity`) + SSO/SAML/SCIM (Enterprise).

## 8.7 Go-to-market técnico

- Importadores 1-click desde Trello/Asana/Jira (reduce fricción de switch).
- Plantillas por industria. API pública + webhooks → ecosistema.
- PLG: free generoso, paywall en timeboxing/IA/Gantt donde está el valor.
