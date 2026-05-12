/**
 * Roles dentro de un tenant. Ordenados de mayor a menor privilegio.
 * El nivel de cada rol se valida en `lib/auth/guards.ts`.
 */
export const TENANT_ROLES = ['owner', 'admin', 'member'] as const;
export type Role = (typeof TENANT_ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (TENANT_ROLES as readonly string[]).includes(value);
}
