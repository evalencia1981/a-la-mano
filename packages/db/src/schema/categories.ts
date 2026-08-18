import { boolean, index, integer, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { directory } from './_directory';

/**
 * Catálogo global de categorías de servicios. ENTIDAD GLOBAL: no lleva
 * `tenant_id` porque las categorías son las mismas para todas las
 * comunidades (plomería, electricidad, etc.).
 *
 * Las CRUD las hace solo Platform Admin. Los miembros pueden sugerir
 * nuevas categorías (queda registrado en audit log, no se crea sola).
 */
export const categories = directory.table(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    groupName: text('group_name').notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    iconName: text('icon_name'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex('categories_slug_idx').on(t.slug),
    activeOrderIdx: index('categories_active_order_idx').on(t.isActive, t.displayOrder),
  }),
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
