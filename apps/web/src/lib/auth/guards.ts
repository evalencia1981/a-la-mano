import 'server-only';
import { db, tenantMembers } from '@evalencia-stack/db';
import { and, eq } from 'drizzle-orm';
import { getCurrentUser } from './current-user';
import { isRole, type Role } from '@/types/role';
import type { CurrentUser } from '@/types';

export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export class ForbiddenError extends Error {
  readonly status: number;
  constructor(message = 'No tenés permisos para realizar esta acción.') {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403;
  }
}

/**
 * Garantiza que hay un user logueado. Tira `AuthError` si no.
 * Toda Server Action que toque datos debe arrancar con esto.
 */
export async function assertAuthenticated(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('No autenticado.');
  return user;
}

/**
 * Garantiza que el user actual es miembro del tenant. Devuelve el rol
 * que tiene en ese tenant.
 *
 * Llamar SIEMPRE antes de operar sobre datos de un tenant — incluso si
 * RLS ya filtra, queremos errores claros en código (no "0 rows affected").
 */
export async function assertTenantMember(tenantId: string): Promise<{
  user: CurrentUser;
  role: Role;
}> {
  const user = await assertAuthenticated();

  const [membership] = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, user.id)))
    .limit(1);

  if (!membership) throw new ForbiddenError('No sos miembro de este tenant.');
  const role: Role = isRole(membership.role) ? membership.role : 'member';

  return { user, role };
}

/**
 * Garantiza que el user actual es miembro del tenant Y tiene uno de los
 * roles listados. Útil para endpoints administrativos.
 */
export async function assertRole(tenantId: string, allowedRoles: Role[]) {
  const result = await assertTenantMember(tenantId);
  if (!allowedRoles.includes(result.role)) {
    throw new ForbiddenError(
      `Esta acción requiere uno de los roles: ${allowedRoles.join(', ')}.`,
    );
  }
  return result;
}
