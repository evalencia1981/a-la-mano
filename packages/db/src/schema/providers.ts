import {
  boolean,
  index,
  integer,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { directory } from './_directory';
import { categories } from './categories';
import { profiles } from './profiles';

/**
 * Proveedores de servicios. ENTIDAD GLOBAL: NO lleva `tenant_id`.
 *
 * Decisión: un mismo plomero puede atender a varias comunidades, y
 * tener un registro único por proveedor evita duplicar datos básicos
 * (nombre, teléfono, fotos). Las calificaciones SÍ son por tenant —
 * viven en `directory.community_providers` + `directory.ratings`.
 *
 * El matching de duplicados se hace por `phoneNormalized` (solo dígitos).
 * Toda inserción debe pasar por `provider.service.findOrCreateProvider`,
 * que normaliza y busca antes de crear.
 */
export const providers = directory.table(
  'providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    name: text('name').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),

    city: text('city').notNull(),
    neighborhood: text('neighborhood'),

    phone: text('phone').notNull(),
    /** Solo dígitos. Es la clave de matching para detectar duplicados. */
    phoneNormalized: text('phone_normalized').notNull(),
    isWhatsapp: boolean('is_whatsapp').default(true).notNull(),

    /** WhatsApp opcional si es distinto al teléfono principal. */
    whatsappNumber: text('whatsapp_number'),
    whatsappNormalized: text('whatsapp_normalized'),

    instagramHandle: text('instagram_handle'),
    websiteUrl: text('website_url'),

    description: text('description'),

    /**
     * Ciudad y barrio normalizados (sin tildes, minúsculas, sin espacios de
     * más). Son las columnas que se comparan contra `tenants.city_normalized`
     * para recomendar proveedores a comunidades cercanas — el texto libre
     * original varía demasiado ("Medellín", "medellin", "MEDELLIN ").
     */
    cityNormalized: text('city_normalized'),
    neighborhoodNormalized: text('neighborhood_normalized'),

    /**
     * Reputación que cruza comunidades. La mantiene el trigger
     * `directory.update_community_provider_rating` junto con el promedio
     * local — NUNCA actualizar a mano.
     *
     * Un proveedor con 4.7 en cuatro unidades distintas es una señal mucho
     * más fuerte que 5.0 en una sola, y es lo que habilita recomendarlo.
     */
    globalRatingAverage: numeric('global_rating_average', { precision: 3, scale: 2 }),
    globalRatingCount: integer('global_rating_count').default(0).notNull(),
    /** En cuántas comunidades está activo. */
    communityCount: integer('community_count').default(0).notNull(),

    createdBy: uuid('created_by').references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    phoneNormalizedIdx: uniqueIndex('providers_phone_normalized_idx').on(t.phoneNormalized),
    nameIdx: index('providers_name_idx').on(t.name),
    categoryByCityIdx: index('providers_category_city_idx').on(t.categoryId, t.city),
    /** Sostiene la búsqueda de recomendados: ciudad + reputación. */
    recomendablesIdx: index('providers_recomendables_idx').on(
      t.cityNormalized,
      t.globalRatingAverage,
    ),
  }),
);

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
