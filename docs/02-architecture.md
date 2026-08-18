# Arquitectura

Este documento explica el **por qué** detrás de las decisiones del
template. Si te toca cambiar algo de la base, leelo primero.

## El monorepo

```
apps/
  web/             ← Next.js, único frontend por ahora
packages/
  db/              ← Drizzle schemas + cliente
  config/          ← Tsconfigs y Tailwind base compartidos
supabase/          ← Bootstrapping SQL (funcs, RLS, seed)
docs/              ← Esto
```

**Por qué pnpm workspaces y no Turbo/Nx:** Turbo es valioso cuando
tenés ≥3 apps y un build orchestration real. Para un solo `apps/web`
es más complejidad que beneficio. Si llegás a 3+ apps, agregar Turbo
es trivial.

## Capas: Server Action → Service → Repository → DB

```
┌──────────────────────────┐
│ React Component (RSC)    │
│  + form / button         │
└──────────┬───────────────┘
           │ FormData / args
┌──────────▼───────────────┐
│ Server Action            │  ← borde HTTP: parseo + result envelope
│ (server/actions/*.ts)    │
└──────────┬───────────────┘
           │ args tipados
┌──────────▼───────────────┐
│ Service                  │  ← Zod validation + autz (guards)
│ (server/services/*.ts)   │     + orquestación + audit
└──────────┬───────────────┘
           │ data
┌──────────▼───────────────┐
│ Repository               │  ← solo SQL/Drizzle. Nada de business logic.
│ (server/repositories/*)  │
└──────────┬───────────────┘
           │
┌──────────▼───────────────┐
│ Drizzle ORM → Postgres   │
└──────────────────────────┘
```

**Reglas:**
- Una Server Action NUNCA toca un repository directo. Pasa por un service.
- Un Service NUNCA toca otro service para casos simples (composición ok
  para audit). Si necesitás composición compleja, vale la pena pensarla.
- Un Repository NUNCA importa otro repository — eso es lógica de negocio,
  va al service.
- Los componentes UI NUNCA llaman al repository ni a Drizzle directo.

**Por qué layered y no hexagonal:** hexagonal te da inversión de
dependencias (puertos + adaptadores). Eso vale cuando tenés múltiples
backends o vas a swappear infra. Para un SaaS con Supabase + Drizzle
fijos, layered es 60% del beneficio con 20% del costo.

**Por qué no tRPC:** Server Actions + RSC en Next 15 ya te dan
type-safety end-to-end sin agregar un transport extra. Si tu cliente
deja de ser Next (ej. una app móvil), reconsiderar.

## Multi-tenancy: shared DB + `tenant_id`

Toda tabla de feature debe tener:

- Columna `tenant_id uuid NOT NULL REFERENCES core.tenants(id)`.
- RLS policy que filtre por `tenant_id IN (select core.user_tenants(auth.uid()))`.
- En código, las Server Actions/services llaman `assertTenantMember(tenantId)`.

**Por qué shared DB y no schema-per-tenant ni DB-per-tenant:**

- **DB-per-tenant** escala por aislamiento pero hace que migrations,
  monitoreo y JOINs cross-tenant sean pesadilla.
- **Schema-per-tenant** divide algunos problemas pero multiplica los
  costos de operación.
- **Shared DB + tenant_id + RLS** es el equilibrio: aislamiento a nivel
  fila garantizado por Postgres, una sola DB que mantener, JOINs
  normales. Es el patrón que usan Linear, Notion, etc.

Si tu proyecto necesita aislamiento físico (compliance, sovereignty),
podés mover tenants específicos a schemas o DBs separadas más adelante
sin reescribir todo.

## Auth: Supabase Auth

**Por qué no NextAuth/Auth.js:** Supabase Auth te da email/pass, OAuth,
magic links, password recovery, MFA y JWT signing de fábrica. Tu DB
ya es Postgres de Supabase — la integración con `auth.users` y RLS
sale natural.

**Por qué no Clerk/Auth0:** Costo y vendor lock-in. Supabase es
open-source y self-hosteable si llega el momento.

**Provider OAuth soportados out-of-the-box:**

- email + password
- Google
- GitHub
- Magic Link (passwordless por email)

Agregar Apple/Twitter/Facebook/Discord/etc → ver
[04-adding-auth-provider.md](./04-adding-auth-provider.md).

## ORM: Drizzle

**Por qué Drizzle y no Prisma:**

- Sin runtime engine: Drizzle es un wrapper TS sobre `pg`/`postgres`,
  sin proceso separado ni binarios nativos. Vercel/Lambda lo aman.
- Migrations en SQL legible (`drizzle generate` produce archivos `.sql`
  que podés revisar y editar).
- Schema definido en TS pero más cerca de SQL puro — sin la magia de
  Prisma Client.
- Soporta nativamente schemas Postgres (`core.tenants` etc).

**Trade-off:** la API es un poco más verbosa que Prisma. Vale la pena.

## Server Components + Server Actions

Todo render que necesita datos del tenant es RSC. Mutaciones van por
Server Actions con `'use server'`. El cliente solo se vuelve "use client"
cuando hace falta interactividad (forms con feedback, dropdowns).

**Por qué `cache()` en `getCurrentUser`/`getCurrentTenant`:** durante un
mismo render del RSC tree, layouts y pages llaman a estos helpers varias
veces. `React.cache` deduplica las queries DB sin necesidad de un store
global.

## Storage de logos

El template **no incluye upload** porque ata el proyecto a un proveedor.
El form de branding solo acepta URLs. Cuando lo necesités, lo recomendado
es Supabase Storage:

```ts
const { data, error } = await supabase.storage
  .from('tenant-logos')
  .upload(`${tenantId}/logo.png`, file);
```

## Email

El servicio de invitaciones loggea el token en consola — no envía email.
Decisión consciente: cada proyecto elige su proveedor (Resend, Postmark,
SES, etc) y no queremos imponerlo.

Cuando agregues envío, modificá `memberService.invite` para llamar tu
adapter de email después del `createInvitation`.

## Decisiones menores

- **Comentarios en español**: la audiencia del template es interna.
  Aplica al código del template; el contenido que escriben las features
  específicas puede ser en cualquier idioma.
- **i18n estructural pero solo español**: el campo `defaultLanguage` ya
  existe en `tenants`. Cuando necesités más idiomas, sumar `next-intl`
  consume ~1 hora.
- **`@a-la-mano/*` como namespace**: al renombrar el proyecto se
  reemplaza todo el namespace en bloque (ver `06-renaming-the-project.md`).
- **Schema `core` en Postgres**: aísla del schema `public` (que
  Supabase usa para storage/auth metadata) y permite versionado más
  limpio.
