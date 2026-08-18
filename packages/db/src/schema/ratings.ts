import { sql } from 'drizzle-orm';
import { boolean, check, index, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { directory } from './_directory';
import { communityProviders } from './community_providers';
import { profiles } from './profiles';
import { tenants } from './tenants';

/**
 * Calificaciones (1-5 estrellas) que dan los miembros a un community_provider.
 * Un user solo puede tener UN rating por (tenant, communityProvider).
 *
 * `isHidden` permite a admins ocultar ratings problemáticos sin borrarlos
 * (auditable). Cuando se oculta, el trigger recalcula el rating promedio
 * sin contar los ocultos.
 */
export const ratings = directory.table(
  'ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    communityProviderId: uuid('community_provider_id')
      .notNull()
      .references(() => communityProviders.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    stars: smallint('stars').notNull(),
    comment: text('comment'),
    isHidden: boolean('is_hidden').default(false).notNull(),
    hiddenBy: uuid('hidden_by').references(() => profiles.id),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenReason: text('hidden_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqueRating: uniqueIndex('ratings_unique_idx').on(t.tenantId, t.communityProviderId, t.userId),
    byProviderIdx: index('ratings_by_provider_idx').on(t.communityProviderId, t.createdAt),
    byUserIdx: index('ratings_by_user_idx').on(t.userId, t.tenantId),
    starsCheck: check('ratings_stars_check', sql`${t.stars} >= 1 AND ${t.stars} <= 5`),
  }),
);

export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;
