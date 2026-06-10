# 5 · UX/UI y Wireframes

Lenguaje visual: **Linear × Vercel × Notion**. Rápido, denso pero respirado,
teclado-first, modo oscuro por defecto. Mobile-first con layouts adaptativos.

## 5.1 Design system

| Token | Valor |
|-------|-------|
| Tipografía | Inter (UI), JetBrains Mono (código/IDs) |
| Escala | 12/13/14/16/20/24/32 px |
| Radius | 6px (controles), 10px (cards), 14px (modales) |
| Sombra | sutil, 1 capa; elevación por borde + bg, no drop-shadows pesadas |
| Color base | `zinc` (neutros). Acento `indigo-500`. |
| Semáforo | verde `emerald-500`, ámbar `amber-500`, rojo `rose-500` |
| Prioridad | 🔥`rose` 🟠`orange` 🟡`amber` 🟢`emerald` |
| Densidad | comfortable / compact (toggle) |
| Componentes | shadcn/ui (Radix). Command palette `⌘K`. |

Atajos: `C` crear tarea · `⌘K` paleta · `G+B` board · `G+G` gantt ·
`G+D` dashboard · `/` buscar · `1-4` set prioridad.

## 5.2 Layout global

```
┌──────────────────────────────────────────────────────────────┐
│ ⌘ ProjectOS   [⌘K Buscar o pedir a la IA…]        🔔  ◎avatar │
├────────────┬─────────────────────────────────────────────────┤
│ ◉ Inicio   │                                                  │
│ ▸ Bandeja  │            ÁREA DE CONTENIDO                      │
│ ▸ Hoy      │     (Dashboard / Board / Gantt / Doc …)          │
│ ─ Proyectos│                                                  │
│  • OPS Web │                                                  │
│  • MKT Q2  │                                                  │
│ ─ OKR      │                                                  │
│ ─ Reportes │                                                  │
│ ⚙ Ajustes  │                                                  │
└────────────┴─────────────────────────────────────────────────┘
```

## 5.3 Dashboard ejecutivo (Módulo 1)

```
┌ KPIs ─────────────────────────────────────────────────────────┐
│ ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌─────────┐ │
│ │Proy.   ││Atrasa- ││Tareas  ││Críticas││Hrs plan││Riesgo   │ │
│ │activos ││dos     ││pend.   ││  12 🔥 ││420/512 ││ 64% ▲   │ │
│ │  18    ││  3 ⚠   ││  87    ││        ││  82%   ││         │ │
│ └────────┘└────────┘└────────┘└────────┘└────────┘└─────────┘ │
├───────────────────────────────┬───────────────────────────────┤
│ 📅 Calendario / Próximos       │ ⚡ Actividad reciente          │
│  Lun 09  • Entregar informe    │  • Ana movió OPS-12 → Revisión │
│  Mar 10  • Demo cliente  🔥    │  • IA reprogramó 3 tareas      │
│  ...                           │  • Luis comentó MKT-4          │
├───────────────────────────────┼───────────────────────────────┤
│ 🚧 Bloqueos (4)                │ 🔔 Alertas                     │
│  OPS-7 espera diseño (3d)      │  • Ana 128% ocupación (RED)    │
│  MKT-9 dep. de API externa     │  • Proyecto Web en riesgo      │
└───────────────────────────────┴───────────────────────────────┘
```

## 5.4 Kanban avanzado (Módulo 3)

```
Backlog │Pendiente│Esta sem.│  Hoy   │En prog.│Bloqueado│Revisión│Terminado
────────┼─────────┼─────────┼────────┼────────┼─────────┼────────┼─────────
        │         │         │┌──────┐│        │         │        │
        │         │         ││🔥OPS-12         WIP 3/3 ⚠ │        │
        │         │         ││Diseñar informe ││        │         │        │
        │         │         ││◎Ana 🏷UX  4h/2h││        │         │        │
        │         │         ││☑3/5  💬2  🔗1  ││        │         │        │
        │         │         │└──────┘│        │         │        │
        │         │         │  +     │        │         │        │
```
Card: emoji-prioridad + key, título, avatar asignado, etiquetas, `est/real`,
checklist, comentarios, deps (🔗). Drag&drop con `dnd-kit`; límite WIP por columna
en rojo al excederse.

## 5.5 Gantt (Módulo 4)

```
Tarea            S24    S25    S26    S27
─────────────────────────────────────────
A Diseño        ████
B Backend           ████████          ← crítico (rojo)
C Frontend          ░░░░██████        ← holgura (gris)
D Pruebas                    ████      ◇ Hito: Release
                                  ▲ conflicto capacidad (Ana)
```
Arrastrar = mover fecha; borde = cambiar duración; al soltar se recalcula CPM y
se resaltan conflictos de capacidad y dependencias rotas.

## 5.6 Vista "Hoy" / Timeboxing (Módulo 6)

```
┌ Mi día — Lun 08 Jun ───────────┬ Tareas a planificar ───────────┐
│ 09:00 ┌─────────────┐          │ 🔥 Diseñar informe   4h  [auto]│
│ 10:00 │ Diseñar inf.│ (auto)   │ 🟠 Revisar PR        1h  [auto]│
│ 11:00 └─────────────┘          │ 🟡 Email cliente   0.5h        │
│ 12:00  ░ almuerzo              │                                │
│ 14:00 ┌─────────────┐          │  Ocupación hoy: 87% 🟡         │
│ 16:00 │ Diseñar inf.│          │  [ Planificar mi semana (IA) ] │
└────────────────────────────────┴────────────────────────────────┘
```

## 5.7 Capacidad (Módulo 7) — heatmap

```
Persona   S24  S25  S26  S27   Burnout
Ana       🟢68 🟡82 🔴128 🔴115  ▲ alto
Luis      🟢55 🟢60 🟡79  🟢62   ok
Marta     🟡85 🟢70 🟢65  🟡88   medio
```

## 5.8 Responsive
- **Desktop**: sidebar + contenido multi-columna.
- **Tablet**: sidebar colapsable, board scroll horizontal con snap.
- **Mobile**: bottom-nav (Inicio·Hoy·Board·IA·Perfil); board en columnas
  apiladas con swipe; crear tarea = FAB.
