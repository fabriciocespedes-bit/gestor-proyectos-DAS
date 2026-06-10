# 🚦 Production Readiness Assessment — Control de Gestión (Pozo Almonte)

> Evaluación de preparación para producción del paso **prototipo → versión productiva sobre Supabase + Next.js**.
> Complementa **[HANDOFF.md](HANDOFF.md)** (estado completo del proyecto).
> Fecha: 2026-06-10 · Estado global: **🟠 NO LISTO PARA PRODUCCIÓN** (prototipo validado; falta construir la app productiva).

---

## 1. Veredicto ejecutivo

| Dimensión | Estado | Nota |
|---|---|---|
| **Producto / UX definido** | 🟢 Completo | El prototipo es una especificación viva y validada con el cliente. |
| **Infraestructura de datos (esquema + RLS)** | 🟠 Parcial | Base sólida pero **desfasada** del modelo del prototipo. |
| **Aplicación productiva (frontend real)** | 🔴 Pendiente | `apps/web` tiene el diseño antiguo; no refleja el producto. |
| **Persistencia / CRUD reales** | 🔴 Pendiente | El prototipo es 100% en memoria. |
| **Seguridad / operación / observabilidad** | 🔴 Pendiente | Sin auth real en la app productiva, sin monitoreo, sin backups verificados. |

**Conclusión:** lo que existe **demuestra el producto** y prueba los cimientos (RLS 5/5, algoritmos 7/7), pero **no hay una aplicación productiva**. El trabajo restante es *construcción*, no *exploración*: el qué está claro, falta el cómo en Supabase/Next.

**Definición de "listo para producción" (Definition of Done):**
1. Login real (Supabase Auth) + roles aplicados. 2. Esquema que cubre el modelo del prototipo + RLS por espacio/proyecto probado. 3. Todos los módulos del prototipo funcionando contra Supabase con persistencia. 4. Archivos en Storage. 5. Deploy en Netlify con dominio + HTTPS. 6. Backups, logs y alertas operativas. 7. Smoke/E2E en verde. 8. Datos demo sustituidos por datos reales del municipio.

---

## 2. Inventario por componente

Leyenda: 🟢 Completo · 🟠 Parcial · 🔴 Pendiente · ⚪ N/A

### 2.1 Producto, diseño y dominio
| Componente | Estado | Evidencia / Ubicación | Brecha para producción |
|---|---|---|---|
| Especificación funcional (UX) | 🟢 | `prototype/projectos.html` | — (es la fuente de verdad) |
| Identidad visual / branding | 🟢 | login + `logo-municipalidad.png`, `fondo-pozo.png` | Confirmar licencia de logo/fondo. |
| Wireframes / UX docs | 🟢 | `docs/05-UX-WIREFRAMES.md` | Actualizar al modelo municipal. |
| Algoritmos de dominio (prioridad/capacidad/timeboxing/CPM) | 🟢 | `packages/core` (7/7 tests) | Cablear al frontend/Edge Functions. |
| Reglas de negocio (PRI_H, jornada, umbrales) | 🟠 | constantes en el HTML (HANDOFF §23) | Externalizar a tabla de configuración. |

### 2.2 Datos y seguridad
| Componente | Estado | Evidencia | Brecha |
|---|---|---|---|
| Esquema base Supabase | 🟠 | `supabase/migrations/0001_init.sql` (20+ tablas) | **No cubre** workspaces, gastos, subtareas-objeto, notes, meetings, events, activities, project_members, task_files, cargo, kanban cols. |
| RLS multi-tenant | 🟠 | `0002_rls.sql` · `rls.test.mjs` (5/5) | Solo por organización; falta **por espacio/proyecto**. |
| Modelo del prototipo en SQL | 🔴 | — | Crear `0003_app_model.sql`. |
| Storage (bucket attachments) | 🟠 | política en `0002_rls.sql` | Falta subida real desde la app. |
| Backups / PITR | 🔴 | — | Activar y **probar restauración**. |
| Migración de datos reales | 🔴 | — | Reemplazar seeds demo. |

### 2.3 Autenticación y autorización
| Componente | Estado | Evidencia | Brecha |
|---|---|---|---|
| Supabase Auth (email+password) | 🟠 | `apps/web/lib/supabase/*`, `seed-admin.mjs` | Cableado base; falta flujo completo en UI productiva. |
| Confirmación de email / SMTP | 🔴 | — | Activar en producción. |
| Recuperación de contraseña | 🔴 | — | Implementar. |
| RBAC aplicado en UI (admin/user) | 🟠 | reglas en prototipo (`canEditProject`, etc.) | Reimplementar en la app real + reforzar por RLS. |
| Política de contraseñas / 2FA | 🔴 | — | Definir (opcional 2FA). |

### 2.4 Aplicación (frontend productivo)
| Componente | Estado | Evidencia | Brecha |
|---|---|---|---|
| Next.js scaffold + middleware sesión | 🟠 | `apps/web` (App Router) | Vistas antiguas ("ProjectOS"), no el modelo municipal. |
| Login | 🟠 | `app/(auth)/login` | Rebrandear + conectar a flujo real. |
| Módulos del producto (Panel, Espacios, Proyectos, Tareas, etc.) | 🔴 | solo en prototipo | **Reescribir** en componentes React contra Supabase. |
| Panel detalle de tarea (gastos/subtareas/archivos/observaciones) | 🔴 | solo en prototipo | Portar. |
| Vistas Kanban/Tabla/Calendario/Gantt | 🟠 | Kanban base en `components/kanban/*` | Completar las 5 vistas del prototipo. |
| Persistencia/CRUD real | 🔴 | — | Implementar con TanStack Query + Supabase. |

### 2.5 Backend / servicios
| Componente | Estado | Evidencia | Brecha |
|---|---|---|---|
| PostgREST (API autogenerada) | 🟢 | Supabase | Depende del esquema nuevo. |
| Edge Function IA (`ai-assistant`) | 🟠 | `supabase/functions/ai-assistant` | Desplegar + cablear en UI. |
| Notificaciones (email/Slack/Teams/WhatsApp) | 🔴 | stub en NestJS | Implementar como Edge Functions/colas. |
| Backend NestJS (alternativa) | 🟢 | `apps/api` | Referencia; **no** es el deploy target. |
| Exportes (PDF/Excel) | 🔴 | visual en prototipo | Implementar. |

### 2.6 DevOps / Operación / Calidad
| Componente | Estado | Evidencia | Brecha |
|---|---|---|---|
| Deploy Netlify (config) | 🟢 | `netlify.toml`, `DEPLOY.md` | Ejecutar deploy real + dominio. |
| Variables de entorno (gestión de secretos) | 🟢 | `.env.example`, `DEPLOY.md` | Cargar en Netlify/Supabase. |
| CI/CD (build/test/deploy automatizado) | 🔴 | — | Pipeline (GitHub Actions). |
| Tests unitarios dominio | 🟢 | `packages/core` (7/7) | — |
| Test de aislamiento RLS | 🟢 | `rls.test.mjs` (5/5) | Ampliar a espacio/proyecto. |
| Tests E2E / integración | 🔴 | — | Playwright sobre la app real. |
| Observabilidad (logs/errores/uptime) | 🔴 | — | Sentry + logs Supabase + uptime. |
| Backups verificados | 🔴 | — | Programar y probar. |
| Accesibilidad (a11y) | 🔴 | emojis/contraste no auditados | Auditar (WCAG AA). |
| Hardening de cabeceras/CSP | 🔴 | — | CSP, HSTS, etc. en Netlify. |

### 2.7 Documentación
| Componente | Estado | Evidencia |
|---|---|---|
| Handoff completo | 🟢 | `docs/HANDOFF.md` |
| Arquitectura / API / RBAC / RLS / Roadmap / SaaS | 🟢 | `docs/01..10` |
| Guía de despliegue | 🟢 | `DEPLOY.md` |
| Runbook operativo (incidentes/backups/rollback) | 🔴 | — |

---

## 3. Resumen cuantitativo

| Estado | Componentes | % aprox. |
|---|---|---|
| 🟢 Completo | 13 | ~30% |
| 🟠 Parcial | 11 | ~25% |
| 🔴 Pendiente | 19 | ~45% |

> Lectura: el **producto y los cimientos** están; la **construcción de la app productiva y la operación** es lo que falta.

---

## 4. Bloqueadores críticos (impiden "go-live")

1. **No existe la aplicación productiva** con el modelo municipal (solo el prototipo en memoria).
2. **Esquema Supabase desfasado** → sin él no hay persistencia ni RLS correctos.
3. **RLS solo por organización** → riesgo de fuga entre espacios/proyectos del modelo nuevo.
4. **Sin backups/observabilidad** → inoperable ante incidentes.
5. **Datos demo y credenciales de prueba** → deben sustituirse y endurecerse antes de exponer.

---

## 5. Próximos 10 pasos priorizados (prototipo → producción)

> Secuencia recomendada. Cada paso indica **objetivo**, **entregable** y **definición de hecho (DoD)**. P0 = bloqueante.

### **Paso 1 · [P0] Congelar el prototipo como spec y definir el modelo de datos objetivo**
- **Entregable:** documento de mapeo "prototipo → tablas Supabase" (a partir de HANDOFF §6.2/§6.3 y §23).
- **DoD:** cada entidad/campo del prototipo tiene su tabla/columna destino y tipo; constantes de negocio identificadas para externalizar.

### **Paso 2 · [P0] Migración de esquema `0003_app_model.sql`**
- **Entregable:** `workspaces` + `workspace_members`, `project_members`, `task_expenses`, `subtasks`, `tasks.column` + `board_columns`, `time_blocks`(decimal), `notes`, `meetings`+`attendees`, `events`, `activities`, `task_files`, `profiles.cargo`. Más tabla `app_settings` para las reglas de negocio (PRI_H, jornada, umbrales).
- **DoD:** migración aplica limpia; `organization_id` denormalizado en todas las hijas; FKs e índices creados.

### **Paso 3 · [P0] RLS por espacio/proyecto + tests**
- **Entregable:** helpers `is_workspace_member()`, `is_project_member()`; políticas en tablas nuevas; ampliar `rls.test.mjs`.
- **DoD:** un usuario no ve datos de un espacio/proyecto donde no participa; suite RLS en verde (≥ 8/8).

### **Paso 4 · [P0] Autenticación productiva de punta a punta**
- **Entregable:** login/logout reales (Supabase Auth), recuperación de contraseña, confirmación de email + SMTP, `profiles.role` (admin/user) cargado en sesión; rutas protegidas por `middleware.ts`.
- **DoD:** alta de admin por seed; un funcionario inicia sesión y solo ve lo suyo; reset de clave funciona.

### **Paso 5 · [P1] Núcleo de la app real: Login → Panel → Espacios → Proyectos**
- **Entregable:** reescritura de `apps/web` (React + TanStack Query + Supabase) reproduciendo la UX del prototipo, con branding municipal; CRUD + permisos (`canEditProject`).
- **DoD:** crear/editar/listar espacios y proyectos persiste en Supabase con RLS; vistas Tabla/Tarjetas operativas.

### **Paso 6 · [P1] Tareas e instrucciones + panel de detalle**
- **Entregable:** tareas (propias/directas/instrucciones), panel slide-over con estado/responsable/prioridad/vencimiento, **subtareas** (con `done_at`), **observaciones**, **gastos** → ejecución presupuestaria; vistas Lista/Tabla/Kanban (drag&drop)/Calendario/Gantt.
- **DoD:** estado "Vencida" derivado por consulta; gastos suman a ejecución del proyecto; auto-completado de proyecto funciona.

### **Paso 7 · [P1] Archivos en Supabase Storage**
- **Entregable:** subida/descarga real en tareas y proyectos al bucket `attachments` con ruta `<org_id>/…`; metadatos en `task_files`.
- **DoD:** un archivo subido por el dueño no es accesible por otra organización (verificado).

### **Paso 8 · [P2] Módulos de soporte + reglas configurables**
- **Entregable:** Time Boxing, Notas, Reuniones, Calendario, Registro de actividades, Rendimiento/Ranking, Reportes; lectura de reglas desde `app_settings` (sin números mágicos); IA (`ai-assistant`) desplegada y cableada.
- **DoD:** módulos persisten; cambiar un umbral en `app_settings` se refleja sin recompilar.

### **Paso 9 · [P2] Calidad, seguridad operativa y observabilidad**
- **Entregable:** suite E2E (Playwright) de flujos críticos; CI/CD (lint+test+deploy); Sentry + logs; CSP/HSTS; backups/PITR activados y **restauración probada**; auditoría a11y básica.
- **DoD:** pipeline en verde bloquea merges rojos; restauración de backup ensayada; cabeceras de seguridad presentes.

### **Paso 10 · [P2] Go-live: datos reales, dominio y handover operativo**
- **Entregable:** carga de usuarios/espacios reales del municipio (sustituir demo), dominio + HTTPS en Netlify, URLs de Auth, **runbook** (incidentes/rollback/backups), capacitación a usuarios.
- **DoD:** checklist de `DEPLOY.md` + DoD de §1 cumplidos; usuarios reales operando; plan de soporte definido.

---

## 6. Recomendación de secuenciado

- **Sprint 1 (P0):** Pasos 1–4 → cimientos de datos, seguridad y auth. *Sin esto, nada productivo.*
- **Sprint 2–3 (P1):** Pasos 5–7 → la app real con persistencia (corazón del producto).
- **Sprint 4 (P2):** Pasos 8–10 → completar módulos, endurecer y publicar.

> **Riesgo principal a gestionar:** seguir añadiendo features solo al prototipo amplía la brecha. **Congelar el prototipo** (Paso 1) y mover el esfuerzo a Supabase/Next es la decisión de mayor impacto.
