# 📌 ESTADO ACTUAL — DAS Control de Gestión Sanitaria (Pozo Almonte)

> Resumen comprimido para retomar sin perder contexto. Actualizado: 2026-06-11.

## Qué es
App de gestión de proyectos/tareas/instrucciones para la **Ilustre Municipalidad de Pozo Almonte**.
**Arquitectura híbrida:** sitio estático (1 archivo HTML) + **Supabase** (Auth + Postgres + RLS + Edge Functions). Todo persiste en Supabase. Piloto para ~25 usuarios.

## Repositorio
- **GitHub:** `github.com/fabriciocespedes-bit/gestor-proyectos-DAS` · rama `main` · **PÚBLICO**.
- **Archivo principal (fuente de verdad):** `prototype/projectos.html`.
  - Tras cada edición: `cp prototype/projectos.html prototype/index.html`, verificar (preview_eval), commit + push.
- Tailwind CDN + SortableJS + `@supabase/supabase-js` (CDN). `HOY` fijo = '2026-06-09'.

## Supabase (backend, ya configurado)
- Proyecto **DAS-CONTROL-GESTION**.
- **URL:** `https://kianrcgzpnzfmeklmjww.supabase.co`
- **anon/publishable key:** `sb_publishable_l6vqjgK-4fDKo1MkpcBOZg_r_U7pz8v` (va en index.html, **pública por diseño**).
- **Admin maestro:** creado en Authentication (correo+clave del usuario). Rol admin via seed-piloto.
- **Ejecutado en SQL Editor:** `0003_app_model.sql` (16 tablas + RLS), `seed-piloto.sql`, `0004_prioridades_checklist.sql` (tabla `priority_items` + RLS).
- **Edge Function desplegada:** `crear-usuario` (crea cuentas con login usando service_role; valida que el llamador sea admin).
- ⚠️ `service_role` NUNCA en el cliente. No hay secretos reales en el repo (verificado).

## Modelo de datos (Supabase, snake_case)
profiles, workspaces, workspace_members, projects, project_members, tasks, subtasks, task_expenses, task_observations, task_files, meetings, meeting_attendees, events, notes, time_blocks, activities, **priority_items**.

## Roles
- **admin (Directivo) = jefe/supervisor** · **user (Funcionario)**. RLS aísla los datos.

## Funcionalidades (todas persisten en Supabase)
- **Auth real** (login/logout/restaurar sesión/cambiar contraseña). **Crear usuarios desde la app** (Edge Function).
- **Espacios, Proyectos, Tareas, Instrucciones, Kanban, Reuniones, Notas, Calendario/Eventos, Time Boxing, Registro** (purga 7 días).
- **Proyectos:** supervisor = admin/dueño; **responsables = funcionarios** (no el admin). Editar estado/prioridad/presupuesto/responsables inline. Gastos de tareas → ejecución presupuestaria. Progreso 100% al completar.
- **Filtros + Visibles (10/25/50):** Instrucciones, Usuarios, Proyectos, Reportes, **Tareas (filtro por responsable)**. El filtro de responsable excluye al admin.
- **Rendimiento (admin):** tarjetas + gráficos (dona/barras), carga/burnout (jornada **44h**), ranking. **Funcionario:** "Mi rendimiento" SIN carga laboral.
- **Reportes** + **Exportar PDF** (Resumen Ejecutivo: rendimiento por funcionario + estado de proyectos).
- **Permisos rol usuario:** solo ve sus espacios/proyectos/tareas; no ve otros usuarios salvo que compartan proyecto/espacio; **no crea usuarios**.
- **Usuarios:** crear (con credenciales), eliminar (botón rojo), **cambiar rol** (Funcionario/Directivo) inline.
- **Modo oscuro** legible (hover/footer corregidos). **Header institucional** (Portal Institucional Pozo Almonte).
- **🔥 Prioridades (panel):** matriz Eisenhower. En **cada cuadrante** (Hacer ahora / Planificar / Atender pronto / Cuando se pueda) se **escriben prioridades personales** (independientes de tareas): agregar, marcar (tachado), editar en línea, eliminar, "Limpiar completadas". Guardadas en `priority_items` (RLS: dueño edita; **admin lee todas**). El **jefe (admin)** tiene **lista de funcionarios clickeable → ve la matriz de cada uno (solo lectura)**. Incluye mini-dashboard (KPIs + dona + urgencia) y guía Eisenhower colapsable. Las tareas del sistema se auto-clasifican aparte en su cuadrante.

## Despliegue (EN MIGRACIÓN — punto pendiente)
- **Netlify quedó BLOQUEADO**: el equipo se quedó "sin créditos" → despliegues de producción deshabilitados → el sitio en vivo **quedó congelado en una versión vieja**. (NO es bug de código.)
- **Migrando a GitHub Pages** (gratis, repo público). Workflow `/.github/workflows/deploy-pages.yml` publica la carpeta `prototype/` en cada push.
- **PENDIENTE (pasos del usuario):**
  1. Settings → Pages → **Source = "GitHub Actions"** (repo ya es público).
  2. Actions → "Publicar en GitHub Pages" → **Run workflow** → esperar verde.
  3. **Nueva URL:** `https://fabriciocespedes-bit.github.io/gestor-proyectos-DAS/`
- A partir de ahí, cada push se republica solo.

## Recomendaciones dadas
- **Hosting:** GitHub Pages (gratis) > Netlify-pago/Vercel (innecesarios para sitio estático; Vercel gratis es solo no-comercial). Dominio propio gratis cuando se quiera.
- **Producción real:** considerar **Supabase Pro (~US$25/mes)** por respaldos diarios.
- **V2.0 futura (consulta previa):** correo de notificaciones, recuperación de contraseña, alertas WhatsApp, Google Calendar (orden y complejidad ya discutidos).

## Cómo verificar cambios (flujo de trabajo)
Editar projectos.html → `cp` a index.html → `preview_start name=prototype` si cayó → `preview_eval` (screenshot suele dar timeout) → commit + push.

## Próximos pasos
1. **Terminar GitHub Pages** (Source=Actions + Run workflow) y confirmar versión nueva en vivo (incógnito).
2. (Opcional) dominio propio; respaldos Supabase Pro; features V2.0; a futuro reescritura a Next.js.
