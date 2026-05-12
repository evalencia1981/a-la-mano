import { text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { core, tenants } from './tenants';
import { profiles } from './profiles';

/**
 * Membership entre `profiles` y `tenants` con un `role`. Es la única
 * fuente de verdad de "qué usuario pertenece a qué tenant y con qué nivel".
 *
 * Roles válidos:
 *  - 'owner'  → puede borrar el tenant y transferir ownership
 *  - 'admin'  → puede invitar/expulsar miembros, editar branding
 *  - 'member' → acceso a features del producto
 */
export const tenantMembers = core.table(
  'tenant_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqueMembership: uniqueIndex('tenant_member_unique').on(t.tenantId, t.userId),
  }),
);

export type TenantMember = typeof tenantMembers.$inferSelect;
export type NewTenantMember = typeof tenantMembers.$inferInsert;
