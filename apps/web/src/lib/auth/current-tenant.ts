import 'server-only';
import { cache } from 'react';
import { db, tenants, tenantMembers } from '@evalencia-stack/db';
import { and, eq } from 'drizzle-orm';
import { getCurrentUser } from './current-user';
import { isRole, type Role } from '@/types/role';
import type { CurrentTenant } from '@/types';

/**
 * Carga un tenant por slug y valida que el user actual sea miembro.
 * Retorna `null` si el user no existe, el tenant no existe, o el user
 * no es miembro.
 *
 * Usar en `[tenantSlug]/layout.tsx` para gateguardear las rutas.
 */
export const getCurrentTenant = cache(async (slug: string): Promise<CurrentTenant | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await db
    .select({
      tenant: tenants,
      role: tenantMembers.role,
    })
    .from(tenants)
    .innerJoin(tenantMembers, eq(tenantMembers.tenantId, tenants.id))
    .where(and(eq(tenants.slug, slug), eq(tenantMembers.userId, user.id)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const role: Role = isRole(row.role) ? row.role : 'member';

  return {
    tenant: row.tenant,
    role,
  };
});

/**
 * Lista todos los tenants donde el user actual es miembro. Usado por el
 * tenant switcher y la pantalla `/select-tenant`.
 */
export async function listUserTenants() {
  const user = await getCurrentUser();
  if (!user) return [];

  return db
    .select({
      tenant: tenants,
      role: tenantMembers.role,
    })
    .from(tenants)
    .innerJoin(tenantMembers, eq(tenantMembers.tenantId, tenants.id))
    .where(eq(tenantMembers.userId, user.id));
}
