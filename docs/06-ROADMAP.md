# 6 · Roadmap de desarrollo

Estrategia: vertical slices que entregan valor usable cada fase. Equipo asumido:
2 full-stack, 1 frontend, 1 backend, 1 diseño/PM (≈5 personas).

## Fase 0 — Fundaciones (Semanas 1–2)
- Monorepo (pnpm + Turborepo), CI (lint/test/build), Docker compose.
- Auth.js + modelo `Organization/User/Membership`, RBAC base (CASL).
- `packages/core` con algoritmos + tests ✅ (ya hecho).
- **Hito**: login multi-tenant + esqueleto navegable.

## Fase 1 — MVP Kanban (Semanas 3–6)
- Módulo 2 (Proyectos) + Módulo 3 (Kanban con dnd-kit, optimistic UI).
- Tareas: etiquetas, checklist, comentarios, archivos (S3), asignación.
- Realtime board (WS + Redis).
- Módulo 5 (Priorización) integrado: score automático visible.
- **Hito**: un equipo puede gestionar trabajo real. **Beta cerrada.**

## Fase 2 — Tiempo y Capacidad (Semanas 7–10)
- Módulo 6 (Timeboxing): generación automática + vista "Mi día".
- Módulo 7 (Capacidad): heatmap, semáforos, burnout.
- Dependencias entre tareas (validación de ciclos).
- Módulo 1 (Dashboard ejecutivo) con KPIs reales.
- **Hito**: diferenciación vs Trello/Asana clara.

## Fase 3 — Planificación pro (Semanas 11–14)
- Módulo 4 (Gantt + CPM + reprogramación, drag de fechas).
- Módulo 8 (OKR jerárquico Objetivo→KR→Proyecto→Tarea).
- Hitos, camino crítico, detección de conflictos.
- **Hito**: cubre casos Jira/MS-Project ligero.

## Fase 4 — Conocimiento e Inteligencia (Semanas 15–18)
- Módulo 9 (Docs estilo Notion, BlockNote, versiones).
- Módulo 10 (IA): ask, plan-week, riesgos, resúmenes (function-calling + RAG pgvector).
- Módulo 11 (Reportes): burndown, velocity, lead/cycle time, export PDF/Excel/PPT.
- **Hito**: "todo en uno" tipo ClickUp.

## Fase 5 — Integraciones y SaaS (Semanas 19–22)
- Módulo 12 (Notificaciones: Email, Slack, Teams, WhatsApp).
- Facturación (Stripe), planes, límites por plan, onboarding.
- Webhooks, API pública, SSO/SAML (Enterprise).
- Observabilidad (OTel), HPA, blue-green deploy.
- **Hito**: **GA / lanzamiento público.**

## Fase 6 — Escala y profundidad (continuo)
- Mobile app (Expo/React Native reusando `core`).
- Automatizaciones (reglas "cuando X → Y"), plantillas, importadores
  (Trello/Asana/Jira), marketplace de integraciones.

## Métricas de éxito por fase
| Fase | KPI objetivo |
|------|--------------|
| 1 | TTFV < 10 min; 5 equipos beta activos |
| 2 | 60% tareas con estimación; uso semanal de "Mi día" |
| 4 | 30% de planes semanales generados por IA aceptados |
| 5 | Conversión free→paid > 4%; churn mensual < 3% |
