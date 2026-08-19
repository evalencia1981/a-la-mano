# CLAUDE.md — A la Mano

Directorio privado de servicios para comunidades cerradas (unidades
residenciales, congregaciones, grupos). Construido sobre el template
`evalencia-stack`.

## Vocabulario del dominio

- **tenant** = comunidad (unidad residencial / iglesia / grupo).
- **member** = residente / feligrés / integrante.
- **provider** = proveedor de servicio (plomero, electricista, etc.) — **entidad global**.
- **community_provider** = asociación entre un tenant y un provider, con rating denormalizado.
- **rating** = calificación 1-5 estrellas + comentario opcional.
- **suggestion** = propuesta de un miembro de agregar un proveedor nuevo.
- **Platform Admin** = user con `profiles.is_platform_admin = true`, gestiona categorías globales y métricas cross-tenant.
- **location** = lugar del mapa físico de la comunidad. Tres tipos: `torre`, `piso` (cuelga de una torre) y `zona` (común, siempre raíz).
- **position** = puesto de trabajo de la comunidad (portería, aseo, mantenimiento). Lleva el teléfono de la **línea del puesto**, no el de una persona.
- **task** = pendiente del administrador. Distinto de `incident_report`: ahí el vecino reporta y la administración recibe; acá la administración reporta y el puesto recibe.
- **dispatch** = envío de una tarea a un puesto, con el token que abre esa tarea sin cuenta.

## Reglas inviolables

Heredadas del template:

1. Toda tabla de feature lleva `tenant_id NOT NULL`. Excepciones documentadas (ver #5).
2. Toda RLS policy filtra por `tenant_id` via `core.user_tenants(auth.uid())`.
3. Toda Server Action llama `assertTenantMember(tenantId)` o `assertRole(tenantId, [...])` antes de operar.
4. TypeScript estricto. Cero `any`. Validación Zod en bordes.
5. Layered: Server Action → Service → Repository → Drizzle. No saltarse capas.
6. Comentarios en español. UI en español.
7. No imports cruzados entre features. Lo compartido va a `lib/` o `server/services/shared/`.

Específicas de A la Mano:

8. **`directory.providers` y `directory.categories` son entidades GLOBALES** (sin `tenant_id`). El motivo está documentado en cada `schema/*.ts`. RLS de estas tablas usa `auth.role() = 'authenticated'` en vez de filtrado por tenant.
9. **`directory.provider_photos`** es 1:N con providers, cascade on delete. Máximo 6 fotos por provider (validar en service, NO en RLS).
10. **Rating denormalizado** (`community_providers.rating_average`, `rating_count`) se mantiene **solo via trigger Postgres** (`directory.update_community_provider_rating`). NUNCA actualizar manualmente desde código.
11. **`phoneNormalized` es la clave de matching**. Toda inserción de provider pasa por `providerService.findOrCreate(...)` que normaliza y busca antes de crear.
12. **Fotos en WebP**: el upload se procesa server-side con `sharp` (resize 1920x1080 max, calidad 85) antes de Supabase Storage. Ver `provider-photo.service.ts`.
13. **El mapa de la unidad lo carga el administrador**, y un reporte **NUNCA se bloquea** por mencionar un lugar que no está cargado: se guarda con el texto crudo, `location_id` queda en null, y el lugar aparece en la lista de pendientes por mapear del admin. Un reporte sin ubicación exacta sirve; uno que la app se negó a recibir, no.
14. **`normalizarLugar` es la clave de matching de lugares** (mismo rol que `phoneNormalized` en providers). Convierte números dictados: "Torre Uno" y "torre 1" caen en la misma torre. Sin fuzzy a propósito — adivinar mal el lugar de un reporte contamina una estadística que después se le presenta al consejo.
15. **Una tarea se asigna al PUESTO, nunca a la persona.** El portero rota por turnos: asignada a quien salió a las dos de la tarde, no la atiende nadie. Por eso el teléfono vive en `positions` y no en un miembro.
16. **Lo único obligatorio de una tarea es `title`.** Sin puesto, sin lugar, sin descripción, se guarda igual. Un pendiente incompleto sirve; uno que la app se negó a recibir vuelve al audio de WhatsApp y de ahí no vuelve.
17. **`suspendido` exige motivo.** Es la única validación rígida del módulo de pendientes, y responde la pregunta que el administrador repitió tres veces: "si no lo atendieron, ¿por qué?".
18. **`/tarea/[token]` es la única ruta pública que muta datos.** No lleva `assertTenantMember` a propósito: la autorización es el token, que `taskService` valida en cada llamada (vigencia, revocación, estado). Abre una tarea y nada más.

## Estructura

```
apps/web/src/
├── app/
│   ├── (auth)/                 # login, signup, magic-link
│   ├── (app)/                  # gate: auth required
│   │   ├── select-tenant/      # selector + creación de comunidad
│   │   └── [tenantSlug]/
│   │       ├── page.tsx        # dashboard de la comunidad
│   │       ├── directory/      # listado, por categoría, perfil del provider
│   │       ├── suggest/        # form de sugerencia
│   │       ├── my-suggestions/
│   │       ├── admin/          # gate adicional: owner/admin
│   │       └── settings/       # heredado del template
│   ├── (platform-admin)/       # gate: is_platform_admin = true
│   └── api/
├── components/
│   ├── provider/               # provider-card, contact-buttons, photo-gallery, rating-*, local-notes
│   ├── category/               # category-tile, category-grid
│   ├── suggestion/             # suggestion-form, suggestion-card
│   ├── wizard/                 # onboarding-checklist
│   ├── billing/                # trial-banner, past-due-banner
│   ├── shared/                 # whatsapp-button, instagram-link, nav-shell, ...
│   └── ui/                     # shadcn primitives
├── lib/
│   ├── supabase/               # client, server, middleware, service-role
│   ├── auth/                   # current-user, current-tenant, guards, platform-admin
│   ├── contact.ts              # normalizePhone, getWhatsappUrl, getInstagramUrl, getTelUrl
│   ├── email/                  # Resend stub + templates
│   └── billing/                # Stripe stub
├── server/
│   ├── actions/                # auth, tenant, member, category, provider, photos, ratings, suggestions, billing
│   ├── services/               # category, provider, photo, community-provider, rating, suggestion, billing, audit
│   └── repositories/           # uno por entidad, sin lógica de negocio
└── types/
```

## Patrones de implementación

### Agregar un feature nuevo del directorio

1. Schema en `packages/db/src/schema/` (con tenant_id si es per-tenant).
2. RLS policy en `supabase/policies.sql`.
3. Repository en `apps/web/src/server/repositories/`.
4. Service en `apps/web/src/server/services/` — con `assertTenantMember` o `assertRole`.
5. Server Action en `apps/web/src/server/actions/` — devuelve `ActionResult<T>`.
6. Página/componentes en `apps/web/src/app/(app)/[tenantSlug]/...`.

Ver `docs/03-adding-a-feature.md` (heredado).

### Tocar un provider

- Crear → `providerService.findOrCreate(data, userId)` — normaliza phone + matching.
- Editar → `providerService.update(id, partialData)`.
- Asociar a una comunidad → `communityProviderService.addProvider(tenantId, input)`.

### Tocar ratings

- Crear/editar → `ratingService.upsert(tenantId, { communityProviderId, stars, comment })`.
  El trigger Postgres recalcula el average.
- Ocultar (moderación) → `ratingService.hide(tenantId, ratingId, reason)`. NO borra el row.

### Subir fotos

- `providerPhotoService.upload(providerId, file)`. La función ya:
  1. valida mime + tamaño,
  2. corre por sharp,
  3. sube a Supabase Storage en `{providerId}/{uuid}.webp`,
  4. crea el row + marca primary si es la primera.

## Comandos

- `pnpm dev` — web en localhost:3000
- `pnpm typecheck` — tsc en todo el monorepo
- `pnpm db:generate` — generar migración
- `pnpm db:push` — aplicar a DB
- `pnpm db:studio` — UI de Drizzle

## Stubs pendientes de cambiar por integración real

- `apps/web/src/lib/billing/stripe.ts` → reemplazar por SDK de Stripe.
- `apps/web/src/lib/email/resend.ts` → reemplazar por SDK de Resend.
- `apps/web/src/app/api/billing/mock-checkout/route.ts` → borrar cuando Stripe esté listo.
- `apps/web/src/server/services/billing.service.ts` → conectar handlers reales de webhook.

## Cosas que NO hacer

- Actualizar `rating_average` o `rating_count` manualmente (el trigger lo hace).
- Saltearse `providerService.findOrCreate` y `INSERT INTO directory.providers` directo (rompe el matching por phoneNormalized).
- Subir fotos sin pasar por sharp (cualquier formato/peso entraría a Storage).
- Borrar ratings problemáticos — usar `hideRating` (auditable).
- Crear categorías directo desde código de members — solo Platform Admin.
- Insertar en `convivencia.locations` sin pasar por `locationService.crear` (rompe el matching por `normalized` y el enganche de los reportes que venían mencionando ese lugar en texto libre).
- Borrar un lugar con reportes — usar `cambiarEstado(..., false)` para darlo de baja y no perder el historial.
- Asignar una tarea a un `profile`. Se asigna al `position`. Si aparece la necesidad de saber quién la hizo, eso va en la bitácora (`task_updates.author_label`), no en la tarea.
- Actualizar `tasks.status` directo. Pasa por `taskService.cambiarEstado` o `actualizarPorToken`, que son los que escriben la bitácora — un estado sin movimiento registrado deja la tarea sin explicación.
- Reusar un token de despacho para otra tarea. Se emite uno por despacho y se revoca por separado.
