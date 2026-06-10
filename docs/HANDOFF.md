# 📋 Documentación de Traspaso — Control de Gestión (Pozo Almonte)

> **Para quien continúa este proyecto** (dev humano o nueva sesión de Claude).
> Este documento captura TODO el estado actual. Léelo completo antes de tocar código.
> Última actualización: 2026-06-10.

---

## Índice

- [0. Lo PRIMERO que debes entender (mapa mental)](#0-lo-primero-que-debes-entender-mapa-mental)
- [1. Resumen ejecutivo](#1-resumen-ejecutivo)
- [2. Objetivo del producto](#2-objetivo-del-producto)
- [3. Arquitectura completa](#3-arquitectura-completa)
- [4. Stack tecnológico](#4-stack-tecnológico)
- [5. Estructura de carpetas](#5-estructura-de-carpetas)
- [6 / 7 / 8. Base de datos, esquema SQL y relaciones](#6--7--8-base-de-datos-esquema-sql-y-relaciones)
- [9. Políticas RLS](#9-políticas-rls)
- [10. Sistema de autenticación](#10-sistema-de-autenticación)
- [11. Roles y permisos](#11-roles-y-permisos)
- [12. Funcionalidades implementadas](#12-funcionalidades-implementadas-en-el-prototipo--todo-verificado-en-vivo)
- [13. Funcionalidades pendientes](#13-funcionalidades-pendientes)
- [14. APIs existentes](#14-apis-existentes)
- [15. Integraciones](#15-integraciones)
- [16. Variables de entorno](#16-variables-de-entorno)
- [17. Flujo de despliegue](#17-flujo-de-despliegue)
- [18. Roadmap](#18-roadmap)
- [19. Deuda técnica](#19-deuda-técnica)
- [20. Decisiones arquitectónicas tomadas](#20-decisiones-arquitectónicas-tomadas)
- [21. Riesgos identificados](#21-riesgos-identificados)
- [22. Próximos pasos priorizados](#22-próximos-pasos-priorizados)
- [23. Convenciones de implementación y reglas de negocio (prototipo)](#23-convenciones-de-implementación-y-reglas-de-negocio-prototipo)
- [Anexo — comandos útiles](#anexo--comandos-útiles)
- 📄 **[Informe de preparación para producción → PRODUCTION-READINESS.md](PRODUCTION-READINESS.md)**

---

## 0. Lo PRIMERO que debes entender (mapa mental)

Este repositorio contiene **DOS cosas que conviven** y NO debes confundir:

| Artefacto | Qué es | Estado | Es la fuente de verdad de… |
|---|---|---|---|
| **`prototype/projectos.html`** | App de **1 solo archivo** (HTML + Tailwind CDN + JS vanilla + SortableJS), datos en memoria. Es un **clon mejorado de "IMPA Tareas / Control de Gestión"** de la Municipalidad de Pozo Almonte. | ✅ Muy avanzado y validado en vivo | **El PRODUCTO y la UX.** Aquí se decidió todo el funcionamiento real. |
| **Stack desplegable** (`apps/web` Next.js + `supabase/` + `apps/api` NestJS + `packages/core`) | Arquitectura de producción "ProjectOS" del diseño inicial. | ⚠️ Diseño base sólido, **desfasado del prototipo** | La infraestructura (auth, RLS, deploy). |

**La tarea grande pendiente:** portar la UX y el modelo de datos del **prototipo** al stack **Next.js + Supabase**. El prototipo es la especificación; Supabase/Next es donde debe vivir en producción. **Hoy NO coinciden** (ver §13 y §19).

- **Branding actual:** Ilustre Municipalidad de **Pozo Almonte** · producto "Control de Gestión" (antes "Gestión Sanitaria" / "ProjectOS").
- **Cómo correr el prototipo:** doble clic en `prototype/projectos.html`, o servirlo (`npx serve prototype`). Credenciales demo: `admin@gestionsanitaria.cl / admin123` (Directivo) · `ana@gestionsanitaria.cl / user123` (Funcionario).

---

## 1. Resumen ejecutivo

Sistema de **gestión de proyectos, tareas e instrucciones** para una municipalidad. Inspirado en IMPA Tareas (el sistema real que usa el cliente) + lo mejor de **ClickUp, Trello y Monday**. Permite a un **Directivo** dirigir equipos, asignar **instrucciones directas**, controlar **ejecución presupuestaria** (meta: gastar el 100% antes del cierre anual para no reintegrar fondos), y a cada **Funcionario** gestionar sus proyectos, tareas, agenda personal (time boxing) y observaciones.

El trabajo se ha hecho de forma **iterativa sobre el prototipo** (validando cada feature con el cliente vía capturas) y existe una **base de despliegue real** (Netlify + Supabase) con esquema SQL, RLS multi-tenant probado (5/5) y algoritmos de dominio testeados (7/7).

## 2. Objetivo del producto

Reemplazar/mejorar el sistema municipal "IMPA Tareas". Que un **directivo líder de equipo** pueda:
- Definir su **equipo** y **espacios de trabajo** (con sus integrantes).
- Crear **proyectos** (con presupuesto, fechas, responsables, etiquetas) y **tareas**.
- Enviar **instrucciones directas** a funcionarios (tareas sin proyecto).
- Ver **rendimiento del equipo**, **carga/burnout** por persona, **ranking** y **semáforo de urgencia**.
- **Registrar gastos** por tarea que suman a la **ejecución presupuestaria** del proyecto.
Cada **funcionario** gestiona lo suyo, su **time boxing** personal, notas, reuniones y observaciones.

## 3. Arquitectura completa

### 3.1 Stack desplegable (objetivo de producción)
```
Navegador ── Netlify (Next.js 15 App Router, SSR + middleware)
                 │  @supabase/ssr (cookies de sesión)
                 ▼
            Supabase
            ├─ PostgreSQL (datos)  + RLS (aislamiento por organización/espacio)
            ├─ Auth (GoTrue, email+password)
            ├─ Storage (bucket 'attachments', aislado por org)
            └─ Edge Functions (Deno) — backend serverless (ej. ai-assistant)
                                          │ OpenAI API (opcional)
```
- El frontend habla **directo** con Supabase (PostgREST autogenerado + cliente JS); RLS hace el aislamiento. La lógica algorítmica pesada va en **Edge Functions** o se reusa desde `packages/core`.
- **Alternativa documentada (no es el deploy target):** `apps/api` (NestJS) como "API propia" para Docker/AWS. Ver `docs/01-ARQUITECTURA.md` y `docs/08-SAAS.md`.

### 3.2 Prototipo (cómo está hecho hoy)
- **Single-file** `prototype/projectos.html` (~1.150 líneas). Sin build, sin backend.
- **Estado en memoria** (arrays JS: `MEMBERS`, `WORKSPACES`, `PROJECTS`, `TASKS`, `TIMEBLOCKS`, `NOTES`, `MEETINGS`, `EVENTS`, `ACTIVITY`).
- Render por funciones `renderX()` que escriben `innerHTML`. Navegación SPA por un objeto `SCREENS`.
- Tailwind por **CDN** (Play CDN), iconos por emojis, drag&drop por **SortableJS** (CDN).
- `prototype/index.html` es una **copia** de `projectos.html` (se sincroniza con `cp`). El servidor estático sirve `index.html`.

## 4. Stack tecnológico

| Capa | Producción (objetivo) | Prototipo (actual) |
|---|---|---|
| Frontend | Next.js 15 (App Router), React 18, TypeScript, Tailwind, TanStack Query, dnd-kit, Zustand | HTML + Tailwind CDN + JS vanilla + SortableJS |
| Backend | Supabase (Postgres+PostgREST+Auth+Storage) + Edge Functions (Deno) | — (en memoria) |
| Backend alt. | NestJS 10 + Prisma (en `apps/api`) | — |
| Dominio | `@projectos/core` (TS puro): prioridad, capacidad, timeboxing, CPM | lógica espejo inline en el HTML |
| Auth | Supabase Auth (email+password) / Auth.js | login simulado contra array `USERS` |
| Infra/Deploy | **Netlify** (web) + **Supabase** (db/auth/storage/functions) | abrir el archivo |
| Tests | vitest (core 7/7), PGlite (RLS 5/5) | verificación manual + `preview_eval` |

## 5. Estructura de carpetas

```
ProjectOS/
├─ prototype/                 ⭐ EL PRODUCTO (clon IMPA). Empezar AQUÍ.
│  ├─ projectos.html          App completa (fuente de verdad de la UX)
│  ├─ index.html              copia servida (sync con projectos.html)
│  ├─ logo-municipalidad.png  logo oficial Pozo Almonte (de rem.saludimpa.cl)
│  └─ fondo-pozo.png          foto de fondo del login (alta resolución)
│
├─ supabase/                  Stack de datos (deploy real)
│  ├─ migrations/0001_init.sql   esquema (20+ tablas snake_case)
│  ├─ migrations/0002_rls.sql    RLS + Storage + triggers
│  ├─ seed.sql · seed-admin.mjs  admin / datos base
│  ├─ functions/ai-assistant/index.ts  Edge Function (Deno)
│  ├─ config.toml
│  └─ rls.test.mjs            prueba de aislamiento (PGlite) — 5/5 ✅
│
├─ apps/
│  ├─ web/                    Next.js (App Router) — vistas del diseño ORIGINAL
│  │  ├─ app/(auth)/login, (app)/dashboard|today|capacity, projects/[id]/board
│  │  ├─ lib/supabase/{client,server,queries}.ts
│  │  ├─ middleware.ts (sesión Supabase) · netlify vía raíz
│  │  └─ components/kanban/*
│  └─ api/                    NestJS (alternativa) — módulos iam/projects/tasks/
│                              timeboxing/gantt/okr/documents/reports/notifications/ai
│
├─ packages/
│  ├─ core/                   algoritmos puros + tests (7/7 ✅)
│  │  └─ src/{prioritization,capacity,timeboxing,scheduling}.ts
│  └─ db/                     Prisma client + RLS helpers + tenant.ts
│
├─ prisma/schema.prisma       modelo Prisma (camelCase) del diseño NestJS
├─ docs/                      01-ARQUITECTURA … 10-RLS-SEGURIDAD, HANDOFF.md (este)
├─ netlify.toml · .env.example · DEPLOY.md · README.md · docker-compose.yml
```

## 6 / 7 / 8. Base de datos, esquema SQL y relaciones

⚠️ **Importante:** existen **DOS esquemas** y NINGUNO refleja aún el prototipo completo:
- **Supabase** (`supabase/migrations/0001_init.sql`, snake_case, UUID, `auth.users`) — el de despliegue.
- **Prisma** (`prisma/schema.prisma`, camelCase) — el del backend NestJS.

### 6.1 Esquema Supabase (vigente para deploy) — tablas de `0001_init.sql`
`profiles` (1:1 con `auth.users`), `organizations`, `memberships`, `teams`, `team_members`,
`projects`, `board_columns`, `milestones`, `tasks`, `dependencies`, `checklist_items`,
`labels`, `task_labels`, `comments`, `attachments`, `time_blocks`, `objectives`,
`key_results`, `key_result_projects`, `documents`, `activities`, `notifications`.

- **Multi-tenant:** todas las tablas hijas llevan `organization_id` **denormalizado** (para que la política RLS sea un comparador directo, sin JOIN por fila → rápido). FKs declaradas.
- **Tipos:** enums Postgres (`task_status_t`, `priority_t`, etc.). PKs `uuid` (`gen_random_uuid()`), timestamps `timestamptz`.
- **Relaciones clave:** `tasks.project_id → projects`, `projects.organization_id → organizations`, `tasks.assignee_id/reporter_id → profiles`, `dependencies(dependent_id, blocking_id) → tasks`, `key_result_projects` (N:M), `attachments.storage_path` apunta al bucket.
- **ERD detallado:** `docs/02-MODELO-DATOS.md` (Mermaid).

### 6.2 GAP CRÍTICO: el modelo del prototipo aún NO está en SQL
El prototipo evolucionó MUCHO. **Antes de migrar a Supabase hay que extender el esquema** para soportar (ver §12 / §19):
- **`workspaces`** (espacios de trabajo) con `leader_id`, y `workspace_id` en projects/tasks; tabla `workspace_members`.
- **`projects.usuarios`** (miembros asignados al proyecto) → tabla `project_members`.
- **`projects.budget` (presupuesto)** y **`task_expenses`** (gastos: monto, desc, fecha) → ejecución presupuestaria.
- **`tasks.column`** (lista Kanban custom, distinta de `status`) y `board_columns` editables.
- **Subtareas como objetos** `{text, done, done_at}` (no booleanos): tabla `subtasks` o JSON.
- **`tasks.origin`** ('propia'|'directa'|'instruccion') y `sent_by` (instrucciones).
- **`time_blocks`** con `start/end` decimales (bloques de 30 min).
- **`notes`**, **`meetings`** (con `attendees`), **`events`** (calendario), **`activities`** (registro), **`task_files`**.
- **`profiles.cargo`** (cargo del funcionario).

### 6.3 Modelo de datos REAL (el del prototipo — documentar como objetivo de migración)
```
MEMBERS    {id, name, role:'Directivo'|'Funcionario', area, cargo}
USERS(login){id, name, email, pass, role:'admin'|'user'}     // id ↔ MEMBERS.id
WORKSPACES {id, name, primary, userIds[], leader}
PROJECTS   {id, title, ownerId, estado, prioridad, inicio, fin, presupuesto,
            etiquetas[], color, workspaceId, usuarios[], desc, pendingDelete}
TASKS      {key, title, projectId|null, who(memberId), estado, prioridad, vence,
            presupuesto, etiquetas[], col(kanban), done, origin, enviadaPor, workspaceId,
            checklist:[{text,done,doneAt}], _c(observaciones):[{w,t}], comments(n),
            gastos:[{monto,desc,fecha}], archivos:[{name,size}]}
TIMEBLOCKS {id, userId, day, start, end, title, color}        // start/end decimales (9.5=9:30)
NOTES      {id, userId, title, body, updated}
MEETINGS   {id, title, date, time, attendees[], place, notes, workspaceId}
EVENTS     {id, title, date, workspaceId}
ACTIVITY   {who, action, obj, ts}
// Constantes: ESTADOS=['Pendiente','En Progreso','En Revisión','Completada']
//             prioridad=Alta/Media/Baja · BOARD_COLS editable (columnas Kanban)
```

## 9. Políticas RLS

Definidas en `supabase/migrations/0002_rls.sql`. **Probadas 5/5** con `supabase/rls.test.mjs` (PGlite/Postgres WASM).

- **Helpers (SECURITY DEFINER):** `current_user_orgs()` (orgs del `auth.uid()` vía memberships), `is_super_admin()`, `is_org_member(org)`.
- **Política genérica** en toda tabla con `organization_id`: `ENABLE` + **`FORCE ROW LEVEL SECURITY`** (clave: aplica incluso al dueño de la tabla), `USING/WITH CHECK (is_org_member(organization_id))`. Loop `do $$ … $$` sobre la lista de tablas.
- **`profiles`:** visible si super-admin, uno mismo, o comparte org. Escritura solo propia.
- **Storage:** bucket `attachments` con política por carpeta `<org_id>/…`.
- **Triggers:** `handle_new_user` (crea profile al registrarse en Auth), `touch_updated_at`.
- **Fail-closed:** sin contexto de org → 0 filas.
- **Pendiente:** añadir políticas por **espacio de trabajo** y por **proyecto** (`is_org_member` → extender a `is_workspace_member` / `is_project_member`) cuando se migre el modelo del prototipo.
- Detalle completo: `docs/10-RLS-SEGURIDAD.md`.

## 10. Sistema de autenticación

- **Producción (Supabase):** Supabase Auth email+password. `apps/web` usa `@supabase/ssr` (`lib/supabase/client.ts`, `server.ts`, `middleware.ts` refresca sesión y protege rutas). Login en `app/(auth)/login` con `signInWithPassword`. Admin sembrado por `supabase/seed-admin.mjs` (Auth admin API, `is_super_admin=true`).
- **Alternativa (NestJS):** `apps/api/src/iam` — bcrypt (cost 12), JWT 15min + refresh 30d, comparación en tiempo constante (anti-enumeración), rol `projectos_auth` con BYPASSRLS solo para login. Ver `docs/10-RLS-SEGURIDAD.md`.
- **Prototipo:** login simulado contra array `USERS` (sin hash). Solo demo.

## 11. Roles y permisos

| Rol | En el producto |
|---|---|
| **Directivo (`admin`)** | Ve/gestiona todo el espacio. Crea/edita/elimina proyectos, tareas, usuarios; envía instrucciones; ve Rendimiento y Reportes; es líder de espacios. |
| **Funcionario (`user`)** | Sus proyectos propios + proyectos donde está **asignado**; sus tareas; módulos personales (Time Boxing, Notas). NO ve Usuarios/Reportes/Instrucciones/Rendimiento. |

Reglas finas implementadas en el prototipo (replicar en Supabase RLS):
- **Editar/crear tareas en un proyecto:** admin **o** dueño **o** usuario asignado (`canEditProject`). Si no → "🔒 Solo lectura".
- **Eliminar proyecto:** si eres líder del espacio/admin → directo (con confirmación); si eres participante → **solicitud de eliminación** que el **líder aprueba/rechaza** (banner `pendingDelete`).
- **Eliminar usuario:** solo admin; no puedes eliminarte ni eliminar a un líder de espacio.
- **Eliminar espacio:** líder/admin; "Principal" (primario) protegido; cascada borra proyectos/tareas.

## 12. Funcionalidades implementadas (en el PROTOTIPO — todo verificado en vivo)

**Núcleo / navegación**
- Login institucional (logo + foto Pozo Almonte) con 2 roles.
- Menú modular: Panel · Espacios de trabajo · Proyectos · Tareas · Time Boxing · Instrucciones · Usuarios · Rendimiento · Reportes · Reuniones · Notas · Calendario · Registro.
- **Buscador global** (proyectos, tareas, instrucciones, personas, reuniones → navega al resultado).
- **Campana de alertas** (plazos por vencer, vencidas, instrucciones, reuniones) con badge; **descartar por alerta** y "Limpiar todo".
- **Menú de usuario** (avatar): Configuración de Perfil, Cambiar Contraseña, **Modo Oscuro** (toggle, legible), Cerrar Sesión.
- **Switcher de espacio** ("cambiar"): cambia de espacio de trabajo en 1 clic.

**Panel / Dashboard:** KPIs (Pendientes/En Progreso/Completadas/Vencidas), **🚦 semáforo de urgencia** (vencidas/hoy/próx. 3 días), **⚡ instrucciones enviadas**, **por estado** (barras), **📊 ejecución presupuestaria total**, tareas recientes.

**Espacios de trabajo:** crear (con **selección de integrantes**, eres líder 👑), **gestionar integrantes** de espacios existentes, **switch**, **eliminar** (confirmación, Principal protegido). Cada espacio agrupa sus proyectos + instrucciones + **tareas directas** (sin proyecto).

**Proyectos:** vista **Tabla estilo Monday** (agrupada por estado, celdas de estado/prioridad en color sólido, cronograma, presupuesto, progreso) **↔ Tarjetas**. **Formulario completo tipo IMPA** (título, estado, prioridad, presupuesto $, fechas, accesibilidad, **seleccionar usuarios**, etiquetas, descripción). Detalle de proyecto con **barra de ejecución presupuestaria** y **auto-completado** (si todas las tareas están Completadas → proyecto Completada y salta al grupo "Completada"). **Eliminar** con aprobación del líder.

**Tareas:** workspace con **5 vistas** — **Lista**, **Tabla** (Monday), **Tablero/Kanban** (Trello), **Calendario**, **Gantt**. Filtros por estado/prioridad. Tareas **directas** sin proyecto.

**Kanban (Trello):** fondo azul, **encabezados de columna editables**, **+ Añade una tarjeta** inline, **marcar hecho** (círculo verde), checklist visible, **+ Añadir/eliminar columnas**, drag&drop.

**Panel de detalle de tarea (slide-over):** estado, responsable, prioridad, vencimiento, presupuesto; **💵 Gastos ejecutados** (suman a ejecución del proyecto); **📎 Archivos** (adjuntar); descripción; **Subtareas = checklist con nombre editable + checkbox + fecha de completado (✓ dd/mm)**; **Observaciones** (botón **Guardar** = guarda y cierra el panel); **🗑 Eliminar tarea** (botón rojo grande al fondo, separado de la ✕). Badge "📌 Instrucción directa de X".

**Formulario enriquecido** (instrucciones y tareas): textarea, **Urgencia** (Normal/Alta/Urgente), **Plazo** en chips (Sin plazo/Hoy/Mañana/7/15/30 días + otra fecha), **Etiquetas**, **Presupuesto + Gasto a registrar**.

**Instrucciones:** directivo → funcionario (tareas directas sin proyecto).

**Usuarios:** tabla con **Cargo**, crear (nombre, **cargo**, área, rol), **eliminar** (admin, confirmación, protecciones).

**Rendimiento del equipo (vista líder):** por funcionario → nº proyectos/tareas, **estados** (pend/progreso/compl/vencidas), **🚦 semáforo personal**, **carga % con riesgo de burnout** (verde/ámbar/rojo). **🏅 Ranking** (más completadas/vencidas/pendientes/en progreso).

**Reportes:** KPIs + tabla de proyectos (campos IMPA) + exportar (visual).

**Time Boxing (personal):** vista **Día / Semana**; bloques de **30 min / 1 h / 1.5 / 2 h** (hora inicio + duración); colores; eliminar bloque.

**Notas** (personales CRUD) · **Reuniones** (crear, aparecen en Calendario) · **Calendario** (vencimientos + reuniones + eventos, **+ Reunión / + Evento**) · **Registro de actividades** (se alimenta solo: crear/completar/gasto/archivo/instrucción/eliminar).

**Transversal:** confirmaciones (`confirmModal`, botón confirmar **azul** igual que "Enviar"), modo oscuro legible, permisos por proyecto/espacio/usuario.

## 13. Funcionalidades pendientes

1. **PORTAR el prototipo a Next.js + Supabase** (la gran tarea). Hoy `apps/web` tiene el diseño ANTIGUO (dashboard/board/today/capacity de "ProjectOS"), no el modelo municipal.
2. **Extender el esquema Supabase** para el modelo del prototipo (§6.2): workspaces, gastos, subtareas-objeto, time_blocks, notes, meetings, events, activities, project_members, task_files, cargo, kanban columns.
3. **Persistencia real** del prototipo (hoy todo se pierde al recargar).
4. **RLS por espacio/proyecto** (extender `is_org_member`).
5. **Notificaciones reales** (email/Slack/Teams/WhatsApp) — hoy stub en NestJS + alertas en UI.
6. **Subir archivos a Supabase Storage** (hoy solo guarda nombre).
7. **IA de productividad** conectada (Edge Function `ai-assistant` existe; falta cablear UI).
8. **Exportar reportes** a PDF/Excel reales (hoy visual).
9. Vistas que faltan en el prototipo: **Gantt arrastrable**, **Ausencias** (Reportes), **Chat/Quehaceres** (módulos IMPA).
10. Tests E2E del prototipo/web.

## 14. APIs existentes

- **Supabase PostgREST** (autogenerado): el frontend consulta tablas directo (`supabase.from('projects').select()`), filtrado por RLS. Helpers en `apps/web/lib/supabase/queries.ts`.
- **Edge Function** `ai-assistant` (`POST /functions/v1/ai-assistant`): asistente de productividad (Deno), usa JWT del usuario (RLS aplica), fallback determinista sin OpenAI.
- **NestJS REST** (`apps/api`, alternativa, **no es el deploy**): 37 endpoints en `docs/03-API.md` — auth, projects, tasks, timeboxing, gantt, okr, documents, reports, notifications, ai. Todo bajo `/v1`.

## 15. Integraciones

- **Supabase** (Postgres, Auth, Storage, Edge Functions).
- **OpenAI** (opcional, en `ai-assistant`; var `OPENAI_API_KEY`).
- **Netlify** (deploy del frontend, `@netlify/plugin-nextjs`).
- **CDNs en el prototipo:** Tailwind Play, SortableJS, Google Fonts (Inter/Poppins). El fondo/logo son archivos locales (`fondo-pozo.png`, `logo-municipalidad.png`).
- Pendientes (stub): Email/Slack/Teams/WhatsApp (módulo notifications de NestJS).

## 16. Variables de entorno

Ver **`.env.example`**. Resumen:
```
# Supabase (Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon          # pública (navegador)
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role        # SECRETA (seed/Edge Functions)
# Admin (seed-admin.mjs)
ADMIN_EMAIL=admin@gestionsanitaria.cl
ADMIN_PASSWORD=Admin#ProjectOS2026
# IA (opcional, Edge Function)
OPENAI_API_KEY= ; OPENAI_MODEL=gpt-4o-mini
# Solo stack NestJS (alternativa): DATABASE_URL / AUTH_DATABASE_URL / JWT_SECRET …
```
- `NEXT_PUBLIC_*` → Netlify (Environment variables) + `.env.local` local.
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_*` → Supabase (Edge Functions secrets) y shell local del seed. **Nunca** en Netlify ni en el cliente.

## 17. Flujo de despliegue

Guía completa en **`DEPLOY.md`** (Netlify + Supabase, ~15 min). Resumen:
1. Crear proyecto Supabase → copiar URL + keys.
2. SQL Editor: ejecutar `supabase/migrations/0001_init.sql` y `0002_rls.sql`.
3. Crear admin: `node supabase/seed-admin.mjs` (o panel + `seed.sql`).
4. (Opcional) `supabase functions deploy ai-assistant` + `supabase secrets set OPENAI_API_KEY=…`.
5. Importar repo en Netlify (lee `netlify.toml`); definir `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`. Deploy → link público.
6. Supabase → Auth → URL Configuration: Site URL = la de Netlify.
- Verificación local: `node supabase/rls.test.mjs` (5/5) · `cd packages/core && npm test` (7/7).
- **Prototipo:** no requiere deploy; doble clic al `.html` o `npx serve prototype`.

## 18. Roadmap

| Fase | Entregable |
|---|---|
| **A. Migración (PRIORIDAD)** | Extender esquema Supabase al modelo del prototipo + RLS por espacio/proyecto. |
| **B. Frontend real** | Reescribir `apps/web` reproduciendo la UX del prototipo (módulos, vistas, panel, formularios) contra Supabase. |
| **C. Persistencia + permisos** | CRUD real, gastos/ejecución, time boxing, notas, reuniones, calendario, registro. Permisos vía RLS. |
| **D. Integraciones** | Storage de archivos, IA (ai-assistant), notificaciones (email/Slack/Teams/WhatsApp). |
| **E. Reportes/export** | PDF/Excel reales; Gantt arrastrable; Ausencias; Chat/Quehaceres. |
| **F. Hardening** | Tests E2E, observabilidad, multi-tenant a escala (ver `docs/08-SAAS.md`). |

## 19. Deuda técnica

1. **Dos modelos de datos divergentes** (Supabase snake_case vs Prisma camelCase vs prototipo en memoria) → unificar hacia Supabase + modelo del prototipo.
2. **El prototipo es 1 archivo de ~1.150 líneas** sin tests ni módulos: excelente como spec/demo, **no** mantenible como producto. Debe reescribirse en componentes Next.
3. **`apps/web` está desfasado** (diseño "ProjectOS" viejo, no el municipal).
4. **Tailwind por CDN** en el prototipo (warning de producción).
5. **Fechas hardcodeadas** en el prototipo (`HOY='2026-06-09'`, semana fija jun 8–14, calendario solo junio 2026).
6. **Dos backends** (NestJS `apps/api` + Supabase) → elegir uno (deploy = Supabase). NestJS queda como referencia/alternativa.
7. **Login del prototipo sin hash** (solo demo).
8. **Archivos no se suben** (solo nombre); IA no cableada en UI.
9. **RLS aún por organización**, falta granularidad por espacio/proyecto del modelo nuevo.
10. **Reglas de negocio como números mágicos** (pesos `PRI_H`, jornada 40 h, umbrales de burnout/ejecución, urgencia→prioridad) embebidas en el HTML — deben externalizarse a configuración (ver §23).
11. **IDs frágiles para concurrencia:** los IDs se generan por longitud de array (`'T-'+(TASKS.length+1)`) o `Date.now()` (ver §23). Sirve en single-user en memoria; en producción usar UUID/secuencia de BD para evitar colisiones.

## 20. Decisiones arquitectónicas tomadas

1. **Pivote de producto:** de "ProjectOS" genérico a **clon municipal de IMPA Tareas** (Pozo Almonte), tras revisar el sistema real del cliente (`jnndev.store`).
2. **Stack de despliegue = Netlify + Supabase** (no NestJS/AWS), por simplicidad y "backend serverless" pedido. NestJS se conserva documentado como alternativa.
3. **RLS como defensa en profundidad:** `organization_id` **denormalizado** en cada tabla hija (comparador directo, sin JOIN por fila) + **`FORCE ROW LEVEL SECURITY`** + rol de runtime sin privilegios. Probado con PGlite.
4. **Prototipo como superficie de iteración rápida:** validar CADA feature con el cliente (capturas) antes de invertir en el stack. Funcionó: el producto está muy definido.
5. **Dominio puro aislado** (`packages/core`): prioridad/capacidad/timeboxing/CPM como funciones puras testeables, reusables en backend y frontend.
6. **Kanban con doble eje:** `col` (listas Trello editables) **separado** de `estado` (status Monday). Permite organizar por días/etapas sin perder el estado real.
7. **Subtareas como objetos** `{text, done, doneAt}` (migradas desde booleanos) para nombre editable + fecha de completado.
8. **Confirmaciones propias** (`confirmModal`) en vez de `confirm()`/`prompt()` nativos; botón confirmar azul consistente.
9. **Gastos por tarea → ejecución presupuestaria del proyecto** (regla de negocio: maximizar gasto antes del cierre anual).
10. **Permisos por espacio/proyecto** con flujo de **aprobación del líder** para eliminar proyectos.
11. **Estado "Vencida" es DERIVADO, no almacenado.** Se guardan 4 estados (`ESTADOS`), pero la UI muestra un 5º estado *virtual* calculado en runtime: `isVencida(t)` = `t.vence < HOY && t.estado !== 'Completada'`, y `efEstado(t)` devuelve `'Vencida'` o el estado real. El Kanban además usa `taskCol(t) = t.col || t.estado` (la columna Trello puede diferir del estado). **Al migrar:** no persistir "Vencida"; calcularla por consulta (vista/columna generada).
12. **Re-render manual con `REDRAW` (no hay framework reactivo).** Cada pantalla, al renderizar, asigna `REDRAW = renderX`; cualquier mutación de estado llama `REDRAW()` para repintar. Las vistas de Tareas/Proyectos guardan el `getList()` activo (`WS_GET` + `rerenderView`). Un flag `DRAG` suprime el "abrir tarea" durante el arrastre. **Es la columna vertebral del prototipo**; al portar a React se reemplaza por estado reactivo + queries.
13. **Reglas de negocio embebidas como constantes (deben externalizarse).** Ver §23: pesos de carga `PRI_H`, jornada base 40 h, umbrales de burnout y de ejecución presupuestaria, y el mapeo urgencia→prioridad. Hoy son "números mágicos" en el HTML; en producción deben ser configurables (tabla de parámetros / settings por organización), no recompilados.

## 21. Riesgos identificados

- **Desfase prototipo ↔ producción:** si se sigue agregando features solo al prototipo sin migrar, la brecha crece. Riesgo de reescritura grande. **Mitigar:** congelar features y empezar la migración (Fase A/B).
- **Single-file no escalable:** el HTML monolítico será difícil de mantener/extender; cada cambio toca un archivo enorme.
- **Pérdida de datos:** el prototipo no persiste; cualquier demo con datos reales se pierde al recargar.
- **Seguridad:** RLS actual es por organización; el modelo nuevo (espacios/proyectos con miembros) necesita políticas nuevas o habrá fugas entre espacios.
- **Identidad/branding:** se usa "Gestión Sanitaria"/"Pozo Almonte"/IMPA — confirmar licencia de logo/fondo (descargados de `rem.saludimpa.cl`) antes de publicar.
- **Fechas fijas** harán que el prototipo "envejezca" (todo apunta a junio 2026).
- **Entorno de captura inestable** (timeouts del visor) — verificar con `preview_eval` (DOM) cuando el screenshot falle.

## 22. Próximos pasos priorizados

1. **[P0] Diseñar el esquema Supabase definitivo** que cubra el modelo del prototipo (§6.2): `workspaces` + `workspace_members`, `project_members`, `task_expenses`, `subtasks`(o JSONB), `tasks.column`+`board_columns`, `time_blocks`(decimal), `notes`, `meetings`+`attendees`, `events`, `activities`, `task_files`, `profiles.cargo`. Migración nueva `0003_app_model.sql`.
2. **[P0] RLS por espacio/proyecto** (helpers `is_workspace_member`, `is_project_member`) + tests PGlite nuevos.
3. **[P1] Reescribir `apps/web`** reproduciendo el prototipo en componentes Next + TanStack Query + Supabase (empezar por Login → Panel → Espacios → Proyectos → Tareas/panel detalle).
4. **[P1] CRUD real + permisos** (proyectos, tareas, gastos, instrucciones, usuarios, espacios) con las reglas de §11.
5. **[P2] Archivos a Storage**, **IA** (cablear `ai-assistant`), **time boxing/notas/reuniones/calendario/registro**.
6. **[P2] Reportes export** (PDF/Excel), **Rendimiento/ranking** server-side.
7. **[P3] Notificaciones** reales, Gantt arrastrable, Ausencias, Chat/Quehaceres, tests E2E.

> **Consejo para la próxima sesión:** abre `prototype/projectos.html` y recórrelo logueado como `admin@gestionsanitaria.cl / admin123`. Es la especificación viva. Luego abre `supabase/migrations/0001_init.sql` para ver el esquema base y empieza por el paso P0.

---

## 23. Convenciones de implementación y reglas de negocio (prototipo)

> Estas son decisiones "menores" pero **críticas para portar sin cambiar comportamiento**. Replicarlas (o externalizarlas a configuración) en producción.

### 23.1 Reglas de negocio = constantes a externalizar
| Regla | Valor actual (en el HTML) | Función | Nota de migración |
|---|---|---|---|
| **Pesos de carga por prioridad** | `PRI_H = {Alta:8, Media:5, Baja:3}` (horas) | `memberLoad` | Configurable por organización. |
| **Jornada base** | 40 h/semana | `memberLoad` (`pct = round(h/40*100)`) | Parametrizar (jornada municipal real). |
| **Umbrales de burnout** | `>100%` rojo · `≥80%` ámbar · resto verde | `memberLoad.flag` | Configurable. |
| **Ejecución presupuestaria (colores)** | `>90%` verde · `50–90%` ámbar · `<50%` rojo | dashboard + detalle proyecto | Configurable. |
| **Semáforo de urgencia** | vencidas · hoy · próx. **3 días** | `alertList`/panel | Ventana parametrizable. |
| **Urgencia → prioridad** | `{Normal→Media, Alta→Alta, Urgente→Alta}` | `openRichForm` | Mapeo de negocio. |
| **Plazos rápidos (chips)** | Hoy / Mañana / 7 / 15 / 30 días | `openRichForm` | — |

### 23.2 Estados y campos derivados (NO almacenar)
- `ESTADOS = ['Pendiente','En Progreso','En Revisión','Completada']` (4 reales).
- **"Vencida"** es virtual: `isVencida(t)` → `efEstado(t)`. No es un estado guardado.
- **Columna Kanban** ≠ estado: `taskCol(t) = t.col || t.estado`. `t.col` solo existe si el usuario movió la tarjeta en el tablero.
- `task.done` es booleano espejo de `estado==='Completada'` (se setea junto, ver `openTask`/`syncProjectStatus`).

### 23.3 Convención de IDs (frágil — cambiar en producción)
| Entidad | Patrón actual |
|---|---|
| Tarea normal | `'T-' + (TASKS.length+1)` |
| Instrucción | `'INS-' + …` (`origin:'instruccion'`) |
| Tarea directa | `'D-' + …` (`origin:'directa'`) |
| Proyecto | `'p' + (PROJECTS.length+1)` |
| Espacio | `'ws' + (WORKSPACES.length+1)` (default activo `'ws1'`) |
| Notas/bloques/reuniones | `'n'|'tb'|… + Date.now()` |
| Miembros base | IDs fijos (`'dir'`, `'ana'`, `'luis'`, …) |

→ En producción: **UUID / secuencias de BD**. Los IDs por `length` colisionan al borrar+crear.

### 23.4 Patrón de render y estado global
- **`REDRAW`**: cada pantalla asigna `REDRAW = renderX`; tras mutar datos se llama `REDRAW()` para repintar (`innerHTML`). No hay reactividad.
- **`SCREENS{}`**: mapa nombre→función de render; la navegación del sidebar invoca `SCREENS[name]()`.
- **Globales clave:** `CURRENT` (sesión), `CURRENT_WS` (espacio activo), `WVIEW` (`list|table|board|calendar|gantt`), `PVIEW` (`table|grid`), `SCREEN_PROJECT` (proyecto abierto), `FILTER` (`{estado,prioridad}`), `DARK`, `DISMISSED` (Set de alertas descartadas), `BOARD_COLS` (columnas Kanban editables), `DRAG` (suprime abrir-tarea durante arrastre), `HOY` (fecha fija).
- **Sin persistencia:** todo en memoria; recargar resetea (no hay `localStorage`).

### 23.5 Drag & drop (SortableJS)
- Kanban: `Sortable.create(col, {group:'b'})`; al soltar, `t.col = e.to.dataset.col`. Columnas con encabezado editable y borrables si quedan vacías; "+ Añadir columna" muta `BOARD_COLS`.

---

### Anexo — comandos útiles
```bash
# Prototipo
npx serve prototype            # o doble clic en prototype/projectos.html
# tras editar projectos.html:  cp prototype/projectos.html prototype/index.html

# Verificaciones
node supabase/rls.test.mjs                 # RLS 5/5
cd packages/core && npm test               # algoritmos 7/7

# Deploy: ver DEPLOY.md (Supabase + Netlify)
```
