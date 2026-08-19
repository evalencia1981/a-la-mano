import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { convivencia } from './_convivencia';
import { locations } from './locations';
import { profiles } from './profiles';
import { tenants } from './tenants';

/**
 * Reportes de riesgo y convivencia.
 *
 * Nace de un problema concreto: los avisos importantes ("hay niños
 * corriendo por la rampa vehicular") viven en el grupo de WhatsApp, se
 * pierden entre mensajes, y cuando la administración quiere actuar no tiene
 * con qué sustentarlo. Un reclamo suelto es un chisme; ocho reportes del
 * mismo tipo, en el mismo lugar, con fecha, son evidencia.
 *
 * Dos decisiones que sostienen todo lo demás:
 *
 *  - Se reporta EL HECHO, nunca a una persona. No hay campo para señalar al
 *    vecino. El patrón lo arma la acumulación, no la acusación — si no,
 *    esto se convierte en una máquina de denunciar y envenena el edificio.
 *  - Quien reporta queda identificado ante la administración (para que
 *    nadie invente) pero jamás ante el resto de los vecinos.
 *
 * Para la administración esto vale sobre todo como constancia de diligencia:
 * el día que ocurra el accidente que todos venían advirtiendo, poder mostrar
 * cuántas veces se reportó y qué se hizo cambia por completo su posición.
 */
export const incidentReports = convivencia.table(
  'incident_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Visible solo para la administración. */
    reportedBy: uuid('reported_by').references(() => profiles.id, { onDelete: 'set null' }),

    /** Slug del tipo. Catálogo en `lib/incident-types.ts`. */
    type: text('type').notNull(),

    /**
     * Dónde pasó, resuelto contra el mapa de la comunidad. Es lo que hace
     * agrupable el patrón. `set null` y no `cascade`: si la administración
     * da de baja una zona, el reporte histórico no se borra — se queda con
     * el texto de `location` como constancia.
     */
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    /**
     * Lo que la persona escribió, siempre. Cuando `locationId` está cargado
     * es el nombre del lugar al momento de reportar; cuando no, es un lugar
     * que todavía no está en el mapa y le queda pendiente al administrador.
     * Nunca se bloquea un reporte por esto.
     */
    location: text('location'),
    description: text('description'),
    /** Evidencia. Todavía sin uploader — el campo ya queda listo. */
    photoUrl: text('photo_url'),

    /** 'nuevo' | 'en_proceso' | 'resuelto' */
    status: text('status').notNull().default('nuevo'),
    resolutionNote: text('resolution_note'),
    resolvedBy: uuid('resolved_by').references(() => profiles.id),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    /* Sostiene la vista de la administración: los de esta comunidad, más
     * recientes primero. */
    porComunidadIdx: index('incident_reports_tenant_idx').on(t.tenantId, t.createdAt),
    /* Sostiene la agrupación por patrón: tipo + lugar. */
    patronIdx: index('incident_reports_patron_idx').on(t.tenantId, t.type, t.location),
    /* Lo mismo pero contra el mapa, que es la agrupación que de verdad
     * sirve: "8 reportes en Torre 2" y no "5 en 'torre 2' y 3 en 'Torre2'". */
    patronLugarIdx: index('incident_reports_patron_lugar_idx').on(
      t.tenantId,
      t.type,
      t.locationId,
    ),
  }),
);

export type IncidentReport = typeof incidentReports.$inferSelect;
export type NewIncidentReport = typeof incidentReports.$inferInsert;
