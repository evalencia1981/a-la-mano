# Agregar un feature

Patrón end-to-end para agregar una entidad nueva al producto. Vamos a
asumir que el feature se llama **"projects"** (cada tenant tiene sus
proyectos).

## Pasos (resumen)

1. Schema Drizzle → migración.
2. RLS policy.
3. Repository.
4. Service.
5. Server Action.
6. Página + form.

## 1. Schema

`packages/db/src/schema/projects.ts`:

```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { core, tenants } from './tenants';

export const projects = core.table('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

Y exportá desde `packages/db/src/schema/index.ts`:

```typescript
export * from './projects';
```

Generar y aplicar:

```bash
pnpm db:generate
pnpm db:push
```

## 2. RLS

En el SQL editor de Supabase:

```sql
alter table core.projects enable row level security;

create policy "members read projects" on core.projects
  for select to authenticated
  using (tenant_id in (select core.user_tenants(auth.uid())));

create policy "members write projects" on core.projects
  for all to authenticated
  using (tenant_id in (select core.user_tenants(auth.uid())))
  with check (tenant_id in (select core.user_tenants(auth.uid())));
```

(Ajustar a "admins write" si solo admins crean proyectos.)

## 3. Repository

`apps/web/src/server/repositories/project.repository.ts`:

```typescript
import 'server-only';
import { db } from '@a-la-mano/db';
import { projects, type NewProject, type Project } from '@a-la-mano/db';
import { and, desc, eq } from 'drizzle-orm';

export const projectRepository = {
  async listByTenant(tenantId: string): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.tenantId, tenantId))
      .orderBy(desc(projects.createdAt));
  },

  async create(data: NewProject): Promise<Project> {
    const [row] = await db.insert(projects).values(data).returning();
    if (!row) throw new Error('No se pudo crear el proyecto.');
    return row;
  },
};
```

## 4. Service

`apps/web/src/server/services/project.service.ts`:

```typescript
import 'server-only';
import { z } from 'zod';
import { projectRepository } from '@/server/repositories/project.repository';
import { auditService } from './audit.service';
import { assertTenantMember } from '@/lib/auth/guards';

const createSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
});

export const projectService = {
  async list(tenantId: string) {
    await assertTenantMember(tenantId);
    return projectRepository.listByTenant(tenantId);
  },

  async create(tenantId: string, input: z.input<typeof createSchema>) {
    const { user } = await assertTenantMember(tenantId);
    const data = createSchema.parse(input);
    const project = await projectRepository.create({ ...data, tenantId });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'project.created',
      resourceType: 'project',
      resourceId: project.id,
      metadata: { name: project.name },
    });

    return project;
  },
};
```

## 5. Server Action

`apps/web/src/server/actions/project.actions.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { projectService } from '@/server/services/project.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { fail, ok, type ActionResult } from './result';
import type { Project } from '@a-la-mano/db';

export async function createProjectAction(
  tenantId: string,
  formData: FormData,
): Promise<ActionResult<{ project: Project }>> {
  try {
    const project = await projectService.create(tenantId, {
      name: String(formData.get('name') ?? ''),
      description: (formData.get('description') as string) || undefined,
    });
    const tenant = await tenantRepository.findById(tenantId);
    if (tenant) revalidatePath(`/${tenant.slug}/projects`);
    return ok({ project });
  } catch (error) {
    return fail(error);
  }
}
```

## 6. Página + form

`apps/web/src/app/(app)/[tenantSlug]/projects/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { projectService } from '@/server/services/project.service';
import { NewProjectForm } from './new-project-form';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ProjectsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const projects = await projectService.list(current.tenant.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Proyectos</h1>
      <NewProjectForm tenantId={current.tenant.id} />
      <ul className="divide-y divide-[var(--color-border)]">
        {projects.map((p) => (
          <li key={p.id} className="py-3">
            <p className="font-medium">{p.name}</p>
            {p.description && (
              <p className="text-sm text-[var(--color-text-secondary)]">{p.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`new-project-form.tsx` (client):

```typescript
'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createProjectAction } from '@/server/actions/project.actions';

export function NewProjectForm({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSubmit(fd: FormData) {
    startTransition(async () => {
      const result = await createProjectAction(tenantId, fd);
      if (result.ok) router.refresh();
      else alert(result.error);
    });
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" required />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creando...' : 'Crear proyecto'}
      </Button>
    </form>
  );
}
```

Listo — agregalo al sidebar (`components/shared/nav-shell.tsx`) y
tenés tu primer feature.

## Prompt para Claude Code

Copy-paste listo:

```
Agregá un feature "projects" siguiendo docs/03-adding-a-feature.md.
El schema mínimo es: id, tenant_id, name, description, created_at.
- Cualquier miembro del tenant puede listar y crear proyectos.
- Solo owners/admins pueden borrar (no implementar delete todavía,
  dejar TODO).
- Agregalo al sidebar como "Proyectos" entre Dashboard y Configuración.
```
