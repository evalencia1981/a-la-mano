import { boolean, index, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { directory } from './_directory';
import { categories } from './categories';
import { communityProviders } from './community_providers';
import { profiles } from './profiles';
import { tenants } from './tenants';

/**
 * Sugerencias de proveedores nuevos hechas por miembros. Quedan en estado
 * `pending` hasta que un admin las aprueba o rechaza.
 *
 * Al aprobar: el service hace match por phoneNormalized → si ya existe el
 * provider, solo crea community_provider; si no, crea ambos.
 * `resultingCommunityProviderId` queda apuntando al resultado.
 */
export const suggestions = directory.table(
  'suggestions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    suggestedBy: uuid('suggested_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    phoneNormalized: text('phone_normalized').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    description: text('description'),
    city: text('city').notNull(),
    neighborhood: text('neighborhood'),
    isWhatsapp: boolean('is_whatsapp').default(true),
    whatsappNumber: text('whatsapp_number'),
    instagramHandle: text('instagram_handle'),
    memberNote: text('member_note'),
    /** 'pending' | 'approved' | 'rejected'. */
    status: text('status').default('pending').notNull(),
    reviewedBy: uuid('reviewed_by').references(() => profiles.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    resultingCommunityProviderId: uuid('resulting_community_provider_id').references(
      () => communityProviders.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pendingByTenantIdx: index('suggestions_pending_idx').on(t.tenantId, t.status),
    byUserIdx: index('suggestions_by_user_idx').on(t.suggestedBy),
  }),
);

export type Suggestion = typeof suggestions.$inferSelect;
export type NewSuggestion = typeof suggestions.$inferInsert;
