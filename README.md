# A la Mano

> Directorio privado de servicios para comunidades cerradas.

A la Mano resuelve el problema de la repetición eterna de "¿alguien tiene un
plomero de confianza?" en chats de WhatsApp de unidades residenciales, iglesias
y grupos. Cada comunidad tiene su directorio privado de proveedores, calificados
por sus propios miembros. Los proveedores se comparten entre comunidades pero
los ratings son contextuales por comunidad.

Construido sobre [evalencia-stack](https://github.com/edward-evalencia/evalencia-stack).

## Stack

- Next.js 15 (App Router + RSC + Server Actions)
- TypeScript estricto
- Supabase (Postgres + Auth + RLS + Storage)
- Drizzle ORM
- Tailwind v4 + shadcn/ui
- `sharp` para procesar fotos
- Stripe + Resend (stubs por ahora)

## Setup

1. Crear proyecto Supabase nuevo (separado de cualquier otro proyecto).
2. Copiar `.env.example` a `apps/web/.env.local` y completar con las credenciales.
3. `pnpm install`.
4. `pnpm db:generate && pnpm db:push`.
5. En el SQL Editor de Supabase, ejecutar **en orden**:
   - `supabase/functions.sql` (helpers + triggers, schemas `core` y `directory`)
   - `supabase/policies.sql` (RLS)
   - `supabase/storage.sql` (bucket `providers-photos`)
   - `supabase/seed.sql` (26 categorías + tenant demo opcional)
6. (Opcional) Configurar Google + GitHub OAuth en Supabase Dashboard → Auth → Providers.
7. `pnpm dev` y abrir http://localhost:3000.
8. Signup → crear comunidad → empezar a usar.
9. Para volverte Platform Admin: en SQL editor,
   `update core.profiles set is_platform_admin = true where email = '<tu@email>';`

## Documentación

- [`docs/01-quickstart.md`](./docs/01-quickstart.md) — setup en 15 min.
- [`docs/02-architecture.md`](./docs/02-architecture.md) — por qué cada decisión.
- [`docs/03-adding-a-feature.md`](./docs/03-adding-a-feature.md) — extender el directorio.
- [`docs/04-adding-auth-provider.md`](./docs/04-adding-auth-provider.md) — sumar Apple/Discord/etc.
- [`docs/05-deployment.md`](./docs/05-deployment.md) — Vercel + Supabase prod.
- [`docs/06-renaming-the-project.md`](./docs/06-renaming-the-project.md) — referencia (ya aplicado acá).

## Específico de A la Mano

- Schema Postgres separado en `core` (template) + `directory` (negocio).
- `directory.providers` y `directory.categories` son **entidades globales** — sin `tenant_id`.
- `directory.community_providers` resuelve el N:N entre tenants y providers.
- El rating denormalizado en `community_providers` se mantiene **vía trigger Postgres** —
  nunca lo actualices manualmente desde código.
- `phoneNormalized` (solo dígitos) es la clave de matching de duplicados de providers.
- Foto pipeline: client upload → sharp resize/WebP → Supabase Storage → row en
  `directory.provider_photos`. Máx 6 fotos por provider.
- Stripe y Resend son stubs — Stripe simula checkout vía `/api/billing/mock-checkout`,
  Resend hace `console.log` cuando no hay API key.

## Comandos

```bash
pnpm dev              # web en localhost:3000
pnpm build            # build de producción
pnpm typecheck        # tsc en todo el monorepo
pnpm lint             # eslint
pnpm db:generate      # generar migración Drizzle desde schemas
pnpm db:push          # aplicar a la DB
pnpm db:studio        # UI de Drizzle
```

## Estructura

```
a-la-mano/
├── apps/web/                   # Next.js
│   └── src/
│       ├── app/                # routes
│       ├── components/         # UI compartida
│       ├── lib/                # supabase, auth, contact, email, billing
│       ├── server/             # actions, services, repositories
│       └── types/
├── packages/
│   ├── db/                     # Drizzle schemas (core + directory)
│   └── config/                 # tsconfig, eslint, tailwind base
├── supabase/                   # functions/policies/seed/storage SQL
└── docs/                       # guías heredadas del template
```

## Roadmap mínimo

- [ ] Integración real con Stripe (reemplazar stub).
- [ ] Integración real con Resend (reemplazar stub).
- [ ] Upload de logo a Supabase Storage en settings/branding.
- [ ] Notificación al miembro cuando su sugerencia se aprueba o rechaza.
- [ ] Editor inline de categorías en Platform Admin (hoy es read-only).
- [ ] Onboarding wizard como modal (hoy es checklist persistente).
