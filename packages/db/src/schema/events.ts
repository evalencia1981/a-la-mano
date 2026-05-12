// Tabla `events` opcional — habilitarla cuando el proyecto necesite un
// event bus persistente (outbox pattern, async workers, etc.).
//
// Descomentar el bloque de abajo, agregar el export desde
// `src/schema/index.ts` y correr `pnpm db:generate`.
//
// import { jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
// import { core, tenants } from './tenants';
//
// export const events = core.table('events', {
//   id: uuid('id').primaryKey().defaultRandom(),
//   tenantId: uuid('tenant_id')
//     .notNull()
//     .references(() => tenants.id, { onDelete: 'cascade' }),
//   topic: text('topic').notNull(),
//   payload: jsonb('payload').notNull(),
//   emittedBy: text('emitted_by'),
//   createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
// });
//
// export type Event = typeof events.$inferSelect;
// export type NewEvent = typeof events.$inferInsert;

export {};
