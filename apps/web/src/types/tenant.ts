import type { Tenant } from '@evalencia-stack/db';
import type { Role } from './role';

/**
 * Tenant + información de la membership del user actual.
 * Lo devuelve `getCurrentTenant()` y se inyecta en el `[tenantSlug]/layout`.
 */
export interface CurrentTenant {
  tenant: Tenant;
  role: Role;
}

export type { Tenant };
