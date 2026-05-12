import { text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { core, tenants } from './tenants';
import { profiles } from './profiles';

/**
 * Invitaciones pendientes de aceptación. El token se entrega vía email
 * y expira (default 7 días — configurar en el service).
 */
export const tenantInvitations = core.table('tenant_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull().default('member'),
  invitedBy: uuid('invited_by').references(() => profiles.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TenantInvitation = typeof tenantInvitations.$inferSelect;
export type NewTenantInvitation = typeof tenantInvitations.$inferInsert;
