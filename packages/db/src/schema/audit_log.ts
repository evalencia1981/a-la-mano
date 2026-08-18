import { jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { core } from './tenants';

/**
 * Bitácora de eventos relevantes por tenant. Se escribe desde el service
 * de audit (`server/services/audit.service.ts`) en cualquier mutación
 * que valga la pena observar (creación de tenant, invitaciones, cambios
 * de rol, expulsiones, etc.).
 *
 * `action` sigue el patrón `recurso.evento` (ej: `tenant.created`,
 * `member.invited`, `member.role_changed`).
 */
export const auditLog = core.table('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  /**
   * Null en acciones de plataforma que no pertenecen a ninguna comunidad,
   * como crear una categoría global. La RLS filtra por `tenant_id`, así que
   * esas entradas no las ve ningún admin de comunidad — solo se leen con
   * service_role desde el panel de plataforma.
   */
  tenantId: uuid('tenant_id'),
  userId: uuid('user_id'),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AuditEntry = typeof auditLog.$inferSelect;
export type NewAuditEntry = typeof auditLog.$inferInsert;
