# Quickstart (15 minutos)

Tenés un proyecto nuevo a partir de `evalencia-stack`. Esta guía te lleva
desde cero hasta `pnpm dev` con un user real logueado.

## 0. Pre-requisitos

- Node.js 20+ (`nvm use` si tenés `nvm`).
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9.12.0 --activate`).
- Cuenta gratis en [supabase.com](https://supabase.com).

## 1. Clonar el template

```bash
pnpm dlx degit evalencia/evalencia-stack mi-proyecto
cd mi-proyecto
```

(Reemplazá `evalencia/evalencia-stack` por el repo público que uses.)

## 2. Renombrar el proyecto

Ver [06-renaming-the-project.md](./06-renaming-the-project.md) — son
~5 reemplazos textuales. Hacelos antes de seguir.

## 3. Instalar dependencias

```bash
pnpm install
```

## 4. Crear el proyecto Supabase

1. https://supabase.com/dashboard → **New project**.
2. Anotá `Project URL`, `anon key`, `service_role key` (Settings →
   API). El `service_role` es secreto: NUNCA lo expongas al cliente.
3. Settings → Database → **Connection string (URI)**. Copiá la del
   `Connection Pooler` (modo `Session`, puerto 5432).

## 5. Configurar `.env`

```bash
cp .env.example .env
```

Pegá los valores del paso anterior:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
DATABASE_URL=postgresql://postgres.xxxxx:PASSWORD@aws-x-us-east-1.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 6. Aplicar schema + RLS

```bash
pnpm db:push
```

Después, en el SQL editor de Supabase, pegá y ejecutá EN ORDEN:

1. `supabase/functions.sql` (triggers + helpers RLS)
2. `supabase/policies.sql` (RLS policies)
3. `supabase/seed.sql` (tenant demo — opcional)

## 7. Configurar OAuth (Google + GitHub)

En Supabase: **Authentication → Providers**.

- **Google**: seguir [docs oficiales](https://supabase.com/docs/guides/auth/social-login/auth-google).
  Necesitás un OAuth client en Google Cloud Console.
- **GitHub**: seguir [docs oficiales](https://supabase.com/docs/guides/auth/social-login/auth-github).
  Crear OAuth App en https://github.com/settings/developers.

En ambos, el **redirect URL** que Supabase te muestra hay que pegarlo en
la consola del provider (es algo como `https://xxxxx.supabase.co/auth/v1/callback`).

**Authentication → URL Configuration**:

- Site URL: `http://localhost:3000` (en dev)
- Redirect URLs: agregar `http://localhost:3000/api/auth/callback`

Si solo querés email + magic link para empezar, podés saltarte este paso.

## 8. Levantar la app

```bash
pnpm dev
```

Abrí http://localhost:3000.

## 9. Crear tu primer user + tenant

1. **Sign up** con email/password (o Google/GitHub si configuraste OAuth).
2. Te redirige a `/select-tenant?create=true`.
3. Creá tu organización. Te devuelve a `/<slug>` (dashboard).

Listo. Ya tenés:

- Sesión activa.
- Tenant con vos como `owner`.
- Branding, miembros, audit log, todo funcionando.

## 10. Próximo paso

Agregá tu primer feature siguiendo
[03-adding-a-feature.md](./03-adding-a-feature.md).
