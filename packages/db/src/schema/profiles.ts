import { boolean, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { core } from './tenants';

/**
 * `profiles.id` referencia `auth.users.id` (Supabase Auth). Se completa
 * automáticamente vía el trigger `on_auth_user_created` definido en
 * `supabase/functions.sql`.
 */
export const profiles = core.table('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  /** A la Mano: bypassea checks de tenant — gestiona categorías globales y métricas. */
  isPlatformAdmin: boolean('is_platform_admin').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
