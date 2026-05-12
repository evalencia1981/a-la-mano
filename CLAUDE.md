# CLAUDE.md — evalencia-stack

Este repo es el template `evalencia-stack` de Edward Valencia.
Si estás leyendo esto desde un proyecto clonado, REEMPLAZÁ este archivo
con el `CLAUDE.md` específico del proyecto.

## Reglas inviolables al desarrollar sobre este template

1. **Toda tabla de feature lleva `tenant_id NOT NULL`** (FK a `core.tenants`).
2. **Toda RLS policy filtra por `tenant_id`** del user actual via
   `core.user_tenants(auth.uid())`.
3. **Toda Server Action llama `assertTenantMember(tenantId)`** o
   `assertRole(tenantId, [...])` antes de operar.
4. **TypeScript estricto. Cero `any`.** Sin excepciones. Si necesitás
   `unknown`, validá con Zod.
5. **Validación con Zod en bordes** — Server Actions, forms, env vars,
   payloads externos.
6. **Arquitectura layered**: Server Action → Service → Repository → Drizzle.
   No saltarse capas. UI nunca toca Drizzle directo.
7. **Comentarios en español.** Identificadores en inglés.
8. **No imports cruzados entre features.** Lo compartido va a `lib/` o
   `server/services/shared/`. Si dos features necesitan lo mismo, vive
   en un lugar central, no en una de las dos.

## Comandos

- `pnpm dev` — levantar web en localhost:3000
- `pnpm typecheck` — verificar tipos en todo el monorepo
- `pnpm db:generate` — generar migración Drizzle desde los schemas
- `pnpm db:push` — aplicar migraciones a la DB
- `pnpm db:studio` — abrir Drizzle Studio (UI para inspeccionar la DB)
- `pnpm lint` — eslint
- `pnpm format` — prettier

## Estructura mental rápida

- ¿Validación de datos del user? → Zod en el **service**, no en la action.
- ¿Autorización? → `assertTenantMember` o `assertRole` en el **service**.
- ¿RLS policy nueva? → patrón estándar de `supabase/policies.sql`.
- ¿Nuevo Server Action? → wrapper sobre el service, retorna `ActionResult<T>`.
- ¿Auditar una acción? → `auditService.log({...})` en el service, dentro
  del try del happy path.

## Cómo agregar un feature

Ver [`docs/03-adding-a-feature.md`](./docs/03-adding-a-feature.md). Incluye un
prompt copy-paste-ready.

## Cosas que NO hacer

- No mockear la DB en tests. Si testeás algo del template, usá una DB
  real (Supabase local o un schema scratch).
- No agregar dependencias sin justificarlas en el PR.
- No introducir capas nuevas (sagas, command handlers, etc) sin discusión.
- No hardcodear nombres del negocio en el template — todo debe ser
  genérico, reusable.
