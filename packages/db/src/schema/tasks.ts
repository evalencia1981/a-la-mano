import { index, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { convivencia } from './_convivencia';
import { locations } from './locations';
import { positions } from './positions';
import { profiles } from './profiles';
import { tenants } from './tenants';

/**
 * Los pendientes del administrador.
 *
 * Nace de un requerimiento hablado, textual: "yo llego a una unidad y me
 * encuentro cinco pendientes, quisiera meter eso con un texto". Tenía todo
 * en un Excel y lo abandonó — no porque el Excel resolviera mal los estados
 * o el seguimiento, sino porque **capturar costaba demasiado**. Usa WhatsApp
 * porque capturar es instantáneo, aunque después se le pierda todo.
 *
 * De ahí sale la única métrica que importa acá: cuántos segundos cuesta
 * meter un pendiente. Si tardamos más que dictar un audio, no competimos.
 *
 * Dos consecuencias directas en el schema:
 *
 *  - **`title` es lo único obligatorio.** Todo lo demás —lugar, puesto,
 *    descripción— es opcional y se completa después con calma.
 *  - **`position_id` es nullable, y eso no es un descuido.** El ejemplo que
 *    él mismo dio ("señor, tengo la factura mala, no me aplicó un pago") no
 *    tiene puesto ni proveedor: es un recordatorio para sí mismo. Un sistema
 *    que solo acepta lo que sabe rutear pierde la mitad de lo que se le
 *    dicta, y el que lo usa vuelve al WhatsApp.
 *
 * Distinto de `incident_reports`, que va en la dirección contraria: ahí el
 * vecino reporta y la administración recibe. Acá la administración reporta
 * y el puesto o el proveedor reciben.
 */
export const tasks = convivencia.table(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),

    /** Lo que se dictó, crudo: "mal aseo torre 1", "grieta ventana apto 505". */
    title: text('title').notNull(),
    description: text('description'),

    /** Contra el mapa de la comunidad. Ver `locations`. */
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    /** Texto del lugar: el del mapa, o lo escrito si todavía no está cargado. */
    location: text('location'),

    /** Al puesto, nunca a la persona. Nullable a propósito. */
    positionId: uuid('position_id').references(() => positions.id, { onDelete: 'set null' }),

    /** 'pendiente' | 'en_proceso' | 'suspendido' | 'resuelto'. */
    status: text('status').notNull().default('pendiente'),
    photoUrl: text('photo_url'),

    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => profiles.id),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    /* La bandeja del día: lo abierto de esta comunidad, lo último primero. */
    bandejaIdx: index('tasks_bandeja_idx').on(t.tenantId, t.status, t.createdAt),
    /* Lo agrupado por puesto, que es como se despacha. */
    porPuestoIdx: index('tasks_puesto_idx').on(t.tenantId, t.positionId, t.status),
    /* "Qué reporté hoy" — la consulta que él pidió explícitamente. */
    porFechaIdx: index('tasks_fecha_idx').on(t.tenantId, t.createdAt),
  }),
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

/**
 * Bitácora de la tarea: cada cambio de estado con su nota y su autor.
 *
 * Es lo que responde la pregunta que él repitió tres veces: "quiero saber
 * si atendieron o no, y si no lo atendieron, por qué". El estado actual solo
 * dice dónde está; la bitácora dice qué pasó en el camino, y es lo que le
 * sirve el día que tenga que sustentarle algo al consejo.
 *
 * El autor viene por dos vías porque hay dos clases de actor: la
 * administración, que tiene cuenta, y el puesto, que entra por un enlace de
 * WhatsApp sin registrarse. Por eso `author_id` y `author_label` conviven.
 */
export const taskUpdates = convivencia.table(
  'task_updates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    /** Estado al que pasó. Null cuando la entrada es solo una nota. */
    status: text('status'),
    note: text('note'),

    /** Quien tiene cuenta: la administración. */
    authorId: uuid('author_id').references(() => profiles.id, { onDelete: 'set null' }),
    /** Quien entró por enlace: "Portería", "Aseo", el nombre del proveedor. */
    authorLabel: text('author_label'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    porTareaIdx: index('task_updates_tarea_idx').on(t.taskId, t.createdAt),
  }),
);

export type TaskUpdate = typeof taskUpdates.$inferSelect;
export type NewTaskUpdate = typeof taskUpdates.$inferInsert;

/**
 * Cada vez que una tarea se despacha a alguien, con el token que le abre
 * esa tarea y nada más.
 *
 * Existe porque el envío sale del WhatsApp personal del administrador
 * (`wa.me`), y entonces la respuesta del otro le llega a *su* chat y el
 * sistema no se entera de nada. El enlace es lo que cierra el ciclo: el del
 * aseo lo toca, ve la tarea, marca "voy" o "listo" con una nota, y el estado
 * se actualiza solo — sin cuenta, sin contraseña, sin instalar nada.
 *
 * Es una tabla y no una columna en `tasks` porque una misma tarea se
 * despacha más de una vez —al puesto y después a un proveedor externo— y
 * hay que saber quién de los dos hizo qué.
 */
export const taskDispatches = convivencia.table(
  'task_dispatches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    positionId: uuid('position_id').references(() => positions.id, { onDelete: 'set null' }),
    /** Cómo se identifica quien recibe, para la bitácora. */
    recipientLabel: text('recipient_label').notNull(),
    /** A qué número se despachó. Queda como constancia del envío. */
    phone: text('phone'),

    /**
     * La llave de la puerta. No es un secreto criptográfico ni pretende
     * serlo: es una URL que abre una tarea. Se revoca y se emite otra.
     */
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    /* Unique: un token tiene que resolver a un despacho y a uno solo. */
    tokenIdx: uniqueIndex('task_dispatches_token_idx').on(t.token),
    porTareaIdx: index('task_dispatches_tarea_idx').on(t.taskId, t.createdAt),
  }),
);

export type TaskDispatch = typeof taskDispatches.$inferSelect;
export type NewTaskDispatch = typeof taskDispatches.$inferInsert;
