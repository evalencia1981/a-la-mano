import { pgSchema, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Schema "core" — todas las tablas del template viven acá para no chocar
 * con `auth`, `storage` u otros schemas de Supabase.
 */
export const core = pgSchema('core');

/**
 * Tabla raíz del multi-tenancy. Cada fila representa una organización
 * que el SaaS atiende. Todo dato de feature lleva FK a `tenants.id`.
 */
export const tenants = core.table(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    logoUrl: text('logo_url'),
    primaryColor: text('primary_color').default('#3B82F6'),
    secondaryColor: text('secondary_color').default('#1E40AF'),
    defaultLanguage: text('default_language').default('es'),
    timezone: text('timezone').default('America/Bogota'),
    status: text('status').default('active'),
    plan: text('plan').default('free'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex('tenants_slug_idx').on(t.slug),
  }),
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
