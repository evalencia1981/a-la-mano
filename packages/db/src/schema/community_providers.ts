import { boolean, index, integer, numeric, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { directory } from './_directory';
import { providers } from './providers';
import { profiles } from './profiles';
import { tenants } from './tenants';

/**
 * Asociación N:N entre tenants (comunidades) y providers (globales).
 *
 * Cada fila es "este proveedor está disponible en esta comunidad". Los
 * ratings, notas locales y rating denormalizado viven acá — son
 * contextuales por comunidad.
 *
 * `ratingAverage` y `ratingCount` se mantienen vía trigger Postgres
 * (`directory.update_community_provider_rating`). NUNCA actualizar
 * manualmente.
 */
export const communityProviders = directory.table(
  'community_providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    /** Notas privadas que solo ven los admins de esta comunidad. */
    localNotes: text('local_notes'),
    /** Promedio 0.00–5.00. Mantenido por trigger. */
    ratingAverage: numeric('rating_average', { precision: 3, scale: 2 }),
    /** Cantidad de ratings visibles (no ocultos). Mantenido por trigger. */
    ratingCount: integer('rating_count').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    addedBy: uuid('added_by').references(() => profiles.id),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqueAssociation: uniqueIndex('community_providers_unique_idx').on(t.tenantId, t.providerId),
    tenantRatingIdx: index('community_providers_tenant_rating_idx').on(t.tenantId, t.ratingAverage),
    providerIdx: index('community_providers_provider_idx').on(t.providerId),
  }),
);

export type CommunityProvider = typeof communityProviders.$inferSelect;
export type NewCommunityProvider = typeof communityProviders.$inferInsert;
