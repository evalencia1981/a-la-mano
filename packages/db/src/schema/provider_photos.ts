import { sql } from 'drizzle-orm';
import { boolean, index, integer, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { directory } from './_directory';
import { providers } from './providers';
import { profiles } from './profiles';

/**
 * Fotos de un provider. 1:N con providers, cascade on delete.
 *
 * Reglas (enforced en service):
 *  - Máximo 6 fotos por provider.
 *  - Toda foto se convierte a WebP server-side antes de upload (vía sharp).
 *  - Solo una foto puede tener `isPrimary = true` por provider (index único parcial).
 */
export const providerPhotos = directory.table(
  'provider_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    /** Path interno en Supabase Storage (bucket `providers-photos`). */
    storagePath: text('storage_path').notNull(),
    /** URL pública (CDN). */
    publicUrl: text('public_url').notNull(),
    altText: text('alt_text'),
    displayOrder: integer('display_order').default(0).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    fileSize: integer('file_size'),
    mimeType: text('mime_type'),
    width: integer('width'),
    height: integer('height'),
    uploadedBy: uuid('uploaded_by').references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    providerOrderIdx: index('provider_photos_provider_order_idx').on(t.providerId, t.displayOrder),
    primaryUniqueIdx: uniqueIndex('provider_photos_primary_unique')
      .on(t.providerId)
      .where(sql`is_primary = true`),
  }),
);

export type ProviderPhoto = typeof providerPhotos.$inferSelect;
export type NewProviderPhoto = typeof providerPhotos.$inferInsert;
