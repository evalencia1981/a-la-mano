# evalencia-stack

> Starter template para aplicaciones SaaS multi-tenant en TypeScript.

Resuelve la base común (auth, tenancy, RLS, branding, audit log) para
que cada proyecto nuevo arranque desde el primer feature de negocio.

## Quickstart (15 min)

Ver [`docs/01-quickstart.md`](./docs/01-quickstart.md).

```bash
pnpm dlx degit evalencia/evalencia-stack mi-proyecto
cd mi-proyecto
pnpm install
cp .env.example .env       # completar con credenciales Supabase
pnpm db:push               # aplicar schema
# pegar supabase/functions.sql + policies.sql + seed.sql en el SQL editor
pnpm dev
```

## Features incluidas

- ✅ **Multi-tenant** con Postgres Row Level Security
- ✅ **Auth**: email/password, Google, GitHub, Magic Link
- ✅ **Roles**: `owner`, `admin`, `member`
- ✅ **Branding por tenant**: logo + colores aplicados via CSS variables
- ✅ **Invitaciones** con token + expiración
- ✅ **Audit log** automático en mutaciones
- ✅ **TypeScript estricto** end-to-end (`noUncheckedIndexedAccess`, cero `any`)
- ✅ **Server Actions + Services + Repositories** layered architecture
- ✅ **Deploy 1-click a Vercel** + Supabase Pro

## Stack

| Capa | Tecnología |
|------|------------|
| Runtime | Node.js 20+ |
| Package manager | pnpm 9 + workspaces |
| Framework | Next.js 15 (App Router, RSC, Server Actions) |
| Lenguaje | TypeScript estricto |
| Estilos | Tailwind CSS v4 (`@theme`) + shadcn/ui |
| Auth | Supabase Auth (`@supabase/ssr`) |
| DB | Supabase Postgres + RLS |
| ORM | Drizzle ORM + drizzle-kit |
| Forms | React Hook Form + Zod |
| Icons | Lucide |

## Filosofía

Cinco reglas, no negociables:

1. **Multi-tenant desde día uno** — toda tabla de feature lleva `tenant_id`,
   toda RLS filtra por tenant.
2. **Layered pragmática** — Server Action → Service → Repository → DB.
   No hexagonal, no DDD pesado.
3. **Login único + selector de tenant + path por tenant slug** —
   `/[tenantSlug]/...`
4. **TypeScript estricto, Zod en bordes, sin `any`.**
5. **Comentarios en español** (la audiencia es interna).

Más detalle: [`docs/02-architecture.md`](./docs/02-architecture.md).

## Estructura

```
evalencia-stack/
├── apps/web/                 ← Next.js
│   └── src/
│       ├── app/              ← routes (RSC)
│       ├── components/       ← UI (shadcn + shared)
│       ├── lib/              ← supabase clients, auth helpers, utils
│       ├── server/           ← actions, services, repositories
│       └── types/            ← TS shared
├── packages/
│   ├── db/                   ← Drizzle schema + cliente
│   └── config/               ← tsconfig + eslint + tailwind base
├── supabase/                 ← bootstrap SQL (functions, policies, seed)
└── docs/                     ← guías paso a paso
```

## Documentación

| Doc | Cuándo leerlo |
|-----|---------------|
| [`docs/01-quickstart.md`](./docs/01-quickstart.md) | Al clonar el template |
| [`docs/02-architecture.md`](./docs/02-architecture.md) | Antes de cambiar la base |
| [`docs/03-adding-a-feature.md`](./docs/03-adding-a-feature.md) | Al sumar tu primera entidad |
| [`docs/04-adding-auth-provider.md`](./docs/04-adding-auth-provider.md) | Para sumar Apple / Discord / etc |
| [`docs/05-deployment.md`](./docs/05-deployment.md) | Antes de ir a prod |
| [`docs/06-renaming-the-project.md`](./docs/06-renaming-the-project.md) | Después del `degit` |

## Comandos

```bash
pnpm dev              # web en localhost:3000
pnpm build            # build de producción
pnpm typecheck        # tsc en todo el monorepo
pnpm lint             # eslint en todo el monorepo
pnpm db:generate      # generar migración Drizzle desde schemas
pnpm db:push          # aplicar schema a la DB
pnpm db:studio        # abrir Drizzle Studio
```

## Estado y roadmap

Este template es **vivo**: cuando aparece un patrón valioso al usarlo en
un proyecto real, se destila acá y se documenta en
[`LEARNINGS.md`](./LEARNINGS.md).

## Autor

Edward Valencia. Open template, MIT.
