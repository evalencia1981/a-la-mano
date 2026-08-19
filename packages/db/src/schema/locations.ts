import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { convivencia } from './_convivencia';
import { tenants } from './tenants';

/**
 * El mapa físico de la comunidad: torres, pisos y zonas comunes.
 *
 * Es la tabla que hace que todo lo demás deje de ser texto suelto. Hoy un
 * reporte guarda "torre 2" en un campo libre, y "Torre 2", "torre2" y "T2"
 * son tres lugares distintos para la base — con lo cual la agrupación por
 * patrón, que es la razón de ser del módulo, no agrupa nada.
 *
 * Tres decisiones que sostienen el diseño:
 *
 *  - **La carga es del administrador**, en el onboarding. Podríamos inferir
 *    el mapa de lo que la gente escribe, pero entonces los nombres los pone
 *    el azar del primer reporte y quedan mal desde el día uno.
 *  - **Nunca bloquea un reporte.** Si alguien menciona un lugar que no está
 *    cargado, el reporte se guarda igual con el texto crudo y el lugar
 *    queda pendiente de mapear. Un reporte sin ubicación exacta es
 *    infinitamente mejor que un reporte perdido.
 *  - **`normalized` es la clave de matching**, igual que `phoneNormalized`
 *    en `providers`. Es lo que permite que "Torre Uno" dictado en voz alta
 *    caiga en la misma torre que "torre 1" tecleado.
 *
 * Jerarquía deliberadamente corta — dos niveles y nada más:
 *
 *   torre  → piso        "Torre 1" → "Piso 5"
 *   zona                 "Gimnasio", "Parqueadero sótano 1", "Portería"
 *
 * Un `piso` siempre cuelga de una `torre`; `torre` y `zona` son siempre
 * raíz. Un árbol más profundo se ve elegante en el schema y es un infierno
 * en un selector que hay que usar caminando, con una mano.
 */
export const locations = convivencia.table(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Solo lo usan los pisos. Si se borra la torre, se van sus pisos. */
    parentId: uuid('parent_id').references((): AnyPgColumn => locations.id, {
      onDelete: 'cascade',
    }),

    /** 'torre' | 'piso' | 'zona'. Catálogo en `lib/location-types.ts`. */
    kind: text('kind').notNull(),
    /** Como lo escribe el administrador: "Torre 1", "Piso 5", "Gimnasio". */
    name: text('name').notNull(),
    /** Clave de matching. Ver `normalizarLugar` en `lib/location-types.ts`. */
    normalized: text('normalized').notNull(),

    /** Para que "Piso 10" no quede entre "Piso 1" y "Piso 2". */
    sortOrder: integer('sort_order').notNull().default(0),
    /**
     * Dar de baja en vez de borrar: los reportes viejos que apuntan acá
     * siguen teniendo sentido histórico aunque la zona ya no exista.
     */
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    /* Sostiene el armado del selector: todo el mapa de una comunidad. */
    porComunidadIdx: index('locations_tenant_idx').on(t.tenantId, t.kind, t.sortOrder),
    /* Sostiene el matching por texto al reportar. */
    matchIdx: index('locations_match_idx').on(t.tenantId, t.normalized),

    /* Dos torres "Torre 1" en la misma comunidad no son un caso de uso, son
     * un error de dedo. Van dos índices y no uno porque en Postgres los
     * NULL son distintos entre sí: sin el parcial, el unique no dispara
     * nunca para las raíces, que es justo donde más importa. */
    unicoRaizIdx: uniqueIndex('locations_unico_raiz_idx')
      .on(t.tenantId, t.normalized)
      .where(sql`parent_id is null`),
    unicoHijoIdx: uniqueIndex('locations_unico_hijo_idx')
      .on(t.tenantId, t.parentId, t.normalized)
      .where(sql`parent_id is not null`),
  }),
);

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
