# LEARNINGS — evalencia-stack

Decisiones tomadas al destilar el template. Cada entrada es una decisión
que costó pensar y que probablemente Edward (o vos, futuro lector) va a
querer entender por qué — sin tener que arqueologar el git log.

## Por qué multi-tenant desde día uno

Agregar tenancy a un SaaS que no lo tenía es de los refactors más
costosos del mundo: toca DB, RLS, URLs, sesiones, navegación, audit,
billing, todo. Hacerlo desde el primer feature es 5x más barato.

Si tu producto realmente nunca va a ser multi-tenant (algo raro: hasta
un consumer SaaS suele necesitar "team workspaces" eventualmente),
podés tratar al tenant como una capa transparente que tiene siempre
una sola instancia.

## Por qué layered y no hexagonal

Hexagonal/Clean tiene sentido cuando vas a swappear infra (cambiar
Postgres → MongoDB, cambiar el broker de eventos, etc) o cuando el
dominio justifica abstracciones agnósticas del transport.

Para un SaaS típico construido sobre Supabase + Drizzle + Next, la
inversión de dependencias agrega ~30% más código sin protegerte de
nada que vaya a pasar. Layered te da:

- Lógica de negocio aislada (service layer).
- Acceso a DB aislado (repository layer).
- Una sola dimensión de complejidad: arriba está el HTTP, abajo está la
  DB.

Si en 2 años descubrís que necesitás hexagonal, el costo de migrar
desde layered es bajo — los services ya están aislados.

## Por qué Drizzle y no Prisma

Tres razones:

1. **Edge/serverless friendly**: sin engine binary ni proceso separado,
   Drizzle es solo TypeScript. Vercel functions arrancan en frío sin penalty.
2. **SQL legible en migrations**: `drizzle-kit generate` produce
   archivos `.sql` que podés revisar en code review.
3. **Schemas Postgres nativos**: definir el schema `core` y separarlo
   de `public` es trivial.

Prisma es excelente pero su engine + Prisma Client + relaciones-objeto
agregan overhead que para este tipo de stack no compensan.

## Por qué Supabase Auth y no Clerk/NextAuth

Supabase ya es nuestra DB. Tener `auth.users` integrado con `public/core`
schemas vía FK directas + el trigger `handle_new_user` simplifica todo:
RLS puede usar `auth.uid()` nativo, el linking user↔profile es one-row.

Clerk es mejor producto pero suma $25/mes/proyecto + vendor lock-in
duro. NextAuth tiene buena base pero pasa muchísima responsabilidad de
seguridad al userland.

## Por qué Server Actions y no tRPC

Server Actions en Next 15 son nativas, tipadas end-to-end por el compilador
de Next, y no requieren un transport extra. Para mutations desde forms
son superiores. tRPC tiene sentido si tu cliente deja de ser Next
(React Native, Tauri, etc) — agregarlo después es lineal.

## Por qué `getCurrentUser` / `getCurrentTenant` con `React.cache`

Durante un mismo render del RSC tree, el layout pide el tenant, la page
pide el tenant, los componentes hijos piden el user. Sin cache: 3-5
queries idénticas a la DB.

`React.cache` deduplica por request automáticamente — sin necesidad de
un store global ni de pasar el tenant por props/context manualmente.

## Por qué un único schema `core` en Postgres

Supabase usa `public` para storage metadata y otras cosas. Aislar las
tablas del template en `core` deja `public` limpio y nos permite
versionar el schema entero con grants/permisos parejos.

Drizzle soporta `pgSchema('core')` nativamente y `drizzle-kit` respeta
el `schemaFilter`.

## Por qué el template NO incluye email

Cada proyecto va a elegir su proveedor (Resend, Postmark, SES, Mailgun).
Imponer uno en el template significa que el 80% de los proyectos van a
tener que ripear nuestro adapter para poner el suyo.

El service de invitaciones loggea el token en consola: alcanza para
desarrollo. La primera vez que un proyecto necesita enviar emails de
verdad, agrega su adapter de email y modifica `memberService.invite`
para llamarlo después del `createInvitation`. Es ~20 líneas.

## Por qué el template NO incluye storage de logos

Mismo razonamiento que email: en cuanto agregamos un proveedor de
storage, todos heredan esa decisión. El form de branding acepta URLs;
cada proyecto sube las imágenes a donde le sirva (Supabase Storage,
S3, Cloudinary).

## Cosas que se quedaron fuera del template

- **Sistema de módulos pluggables** (manifests, registry): específico
  de plataformas con muchas features verticales. No la mayoría de los SaaS.
- **Print queue / ESC-POS**: específico de proyectos con hardware POS.
- **Stripe / billing**: se agrega cuando el proyecto efectivamente
  necesita cobrar.
- **Notificaciones in-app**: cada producto tiene su modelo.
- **Tests E2E**: no hay un Playwright config porque tests dependen
  fuertemente del producto.

## Próximos aprendizajes

(Espacio para que Edward los agregue en uso real. Cuando un patrón aparece
en 2+ proyectos y no está acá, hay que destilar.)
