# Deployment

Stack recomendado: **Vercel + Supabase production tier**.

## 1. Supabase production

Si arrancaste con el free tier, podés mantenerlo para staging y crear un
proyecto separado para producción. Recomendado:

- **Plan Pro** ($25/mes): point-in-time recovery + 8 GB DB + 100 GB
  bandwidth. Lo justo para SaaS arrancando.
- **Read replicas**: solo si tu workload lo justifica (~$50/mes extra).

Importante para prod:

- Setear backups automáticos (Pro lo hace).
- Setear el `Site URL` correcto en Authentication → URL Configuration.
- Agregar tu dominio prod (`https://miapp.com/api/auth/callback`) a
  Redirect URLs.
- En cada OAuth provider (Google, GitHub, etc), actualizar el redirect
  URL para que apunte a tu Supabase prod.

## 2. Crear el proyecto Vercel

1. `vercel.com` → New project → importá el repo.
2. **Root directory**: `apps/web`. Vercel detecta Next.js solo.
3. Build command: `pnpm build` (Vercel lo infiere por el `pnpm-workspace.yaml`).
4. Install command: `pnpm install --frozen-lockfile`.

## 3. Variables de entorno

En Vercel → Settings → Environment Variables, agregar todas las del
`.env.example`:

| Variable | Production | Preview |
|----------|------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | prod URL | preview URL (puede ser la misma) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod anon | preview anon |
| `SUPABASE_SERVICE_ROLE_KEY` | prod sr | preview sr |
| `DATABASE_URL` | prod pooler | preview pooler |
| `NEXT_PUBLIC_SITE_URL` | `https://miapp.com` | `https://miapp-git-...vercel.app` |

**Tip:** podés generar `NEXT_PUBLIC_SITE_URL` dinámico en runtime usando
`VERCEL_URL` si querés que los previews funcionen sin setearlo cada vez:

```typescript
// env.ts
NEXT_PUBLIC_SITE_URL: z
  .string()
  .url()
  .default(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
```

## 4. Custom domain

Vercel → Settings → Domains → agregar tu dominio. Apunta los DNS records
que Vercel te indica.

Después actualizar en Supabase:
- Site URL: `https://miapp.com`
- Redirect URLs: agregar `https://miapp.com/api/auth/callback`

## 5. Database connection pooling

Importante: en serverless (Vercel functions), las conexiones a Postgres
son efímeras. Por eso usamos el **Supabase Pooler** (PgBouncer) en lugar
de la conexión directa.

El `DATABASE_URL` ya lo refleja:

```
postgresql://postgres.xxxxx:PASSWORD@aws-x-us-east-1.pooler.supabase.com:5432/postgres
                                                    ^^^^^^^ pooler, no `db.xxxxx`
```

Modo `Session` (puerto 5432) es lo que necesita Drizzle. Modo `Transaction`
(puerto 6543) no soporta `prepare`/transactions explícitas — no usar.

## 6. Health check

Agregá una ruta `/api/health` que pingee la DB:

```typescript
// app/api/health/route.ts
import { db } from '@evalencia-stack/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  await db.execute(sql`select 1`);
  return Response.json({ ok: true });
}
```

Configurar Vercel monitors o UptimeRobot para pingearla cada minuto.

## 7. Logs

Vercel Logs te da observability básica. Para algo más serio:
- **Better Stack** ($10/mes) — drop-in log aggregation.
- **Supabase Logs** — vienen incluidos en Pro, con SQL search.
- **Sentry** — error tracking si tu producto lo justifica.

## 8. Costos esperados (orden de magnitud)

| Servicio | Plan | Costo |
|----------|------|-------|
| Vercel | Pro | $20/mes/usuario |
| Supabase | Pro | $25/mes |
| Dominio | varios | $12/año |
| **Total mínimo prod** | | **~$45/mes** |

(Free tier de Vercel + Supabase cubre proyectos pre-launch.)
