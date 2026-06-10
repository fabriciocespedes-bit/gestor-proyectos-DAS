# 🚀 Publicar ProjectOS — Netlify + Supabase

Stack de producción: **Netlify** (frontend Next.js) + **Supabase** (base de datos,
autenticación, storage y backend serverless). Al terminar tendrás un **link público**.

Tiempo estimado: ~15 min. Todo tiene plan gratuito suficiente para validar.

---

## 1 · Crear el proyecto Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project**. Anota la
   contraseña de la base de datos.
2. Cuando esté listo, ve a **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secreta) → `SUPABASE_SERVICE_ROLE_KEY`

## 2 · Crear el esquema + RLS

En el panel: **SQL Editor → New query**, y ejecuta en orden (copia/pega cada archivo):

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tablas, enums, índices.
2. [`supabase/migrations/0002_rls.sql`](supabase/migrations/0002_rls.sql) — políticas RLS, storage, triggers.

> Alternativa con CLI: `supabase link --project-ref <ref>` y `supabase db push`.

## 3 · Crear el administrador de cuentas

**Opción A — script (recomendada):**
```bash
cd apps/web && npm i        # trae @supabase/supabase-js
SUPABASE_URL="https://TU-PROYECTO.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="...service_role" \
ADMIN_EMAIL="admin@projectos.app" ADMIN_PASSWORD="Admin#ProjectOS2026" \
node ../../supabase/seed-admin.mjs
```

**Opción B — panel:** Authentication → **Add user** (email + contraseña, marca
*Auto Confirm*). Luego SQL Editor → ejecuta [`supabase/seed.sql`](supabase/seed.sql).

## 4 · (Opcional) Backend serverless — Edge Function de IA

```bash
supabase functions deploy ai-assistant
supabase secrets set OPENAI_API_KEY=sk-...        # opcional, para respuestas libres
```
Sin clave, la función responde con lógica determinista (atrasos, foco de hoy).

## 5 · Desplegar el frontend en Netlify

1. Sube el repo a GitHub.
2. [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git** →
   elige el repo. La configuración la lee de [`netlify.toml`](netlify.toml)
   (build con pnpm + plugin de Next.js); deja *Base directory* vacío.
3. **Site settings → Environment variables**, añade:
   | Clave | Valor |
   |-------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | tu Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon key |
4. **Deploy site**. Netlify te dará el link público, p. ej.
   `https://projectos.netlify.app`.

## 6 · Conectar Auth con tu dominio

En Supabase → **Authentication → URL Configuration**:
- *Site URL*: `https://TU-SITIO.netlify.app`
- *Redirect URLs*: añade esa misma URL.

(También está en [`supabase/config.toml`](supabase/config.toml) para la CLI.)

## 7 · Entrar

Abre el link → `/login` → `admin@projectos.app` / `Admin#ProjectOS2026`.
**Cambia la contraseña** tras el primer acceso.

---

## Checklist de verificación
- [ ] `0001` y `0002` ejecutados sin error (Table editor muestra las tablas).
- [ ] En **Authentication → Policies** se ven las políticas RLS activas.
- [ ] El admin puede iniciar sesión y ver el dashboard.
- [ ] Un usuario de otra organización NO ve datos ajenos (RLS).

## Seguridad — recordatorios
- `service_role` **solo** en Supabase/local, jamás en Netlify ni en el cliente.
- En producción activa **confirmación de email** (Auth → Providers → Email) y SMTP.
- RLS ya está forzado (`FORCE ROW LEVEL SECURITY`): el aislamiento no depende del frontend.

## Verificado localmente
El esquema + RLS se prueban contra Postgres real (PGlite):
```bash
npm run db:test-supabase        # 5/5 ✓ (aislamiento por organización)
```
