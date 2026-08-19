import { boolean, index, integer, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { convivencia } from './_convivencia';
import { tenants } from './tenants';

/**
 * Puestos de trabajo de la comunidad: portería, aseo, mantenimiento.
 *
 * La decisión que sostiene toda la tabla: **una tarea se asigna al puesto,
 * nunca a la persona.** El portero rota por turnos —son tres personas
 * distintas en un día— y una tarea asignada a quien salió a las dos de la
 * tarde no la atiende nadie. Lo mismo cuando el del aseo se enferma o
 * renuncia: la tarea sigue viva, cambia quien la ve.
 *
 * Por eso el teléfono vive acá y no en un miembro: es la línea del puesto
 * —el celular que está en la portería— y no la de una persona. Es también
 * la única forma que funciona con `wa.me`, que abre un chat con un número
 * y no con tres.
 *
 * No hay cuenta ni contraseña del otro lado: la tarea le llega por WhatsApp
 * con un enlace que abre esa tarea y nada más. Ver `task_dispatches`.
 */
export const positions = convivencia.table(
  'positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    /** "Portería", "Aseo", "Mantenimiento". */
    name: text('name').notNull(),
    /** Clave de matching, misma mecánica que en `locations`. */
    normalized: text('normalized').notNull(),

    /** La línea del puesto. Sin esto no se le puede despachar nada. */
    phone: text('phone'),
    /** Solo dígitos. Es lo que arma la URL de WhatsApp. */
    phoneNormalized: text('phone_normalized'),

    /** Ícono de `lib/category-icons.ts`. */
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    /**
     * Baja en vez de borrado: las tareas históricas del puesto siguen
     * teniendo sentido aunque la unidad ya no tercerice ese servicio.
     */
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    porComunidadIdx: index('positions_tenant_idx').on(t.tenantId, t.sortOrder),
    unicoIdx: uniqueIndex('positions_unico_idx').on(t.tenantId, t.normalized),
  }),
);

export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;
