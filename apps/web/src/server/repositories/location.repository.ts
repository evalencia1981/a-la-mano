import 'server-only';
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db, incidentReports, locations, type Location, type NewLocation } from '@a-la-mano/db';

/**
 * Un lugar que alguien mencionó al reportar y que no está en el mapa.
 * Es la lista de pendientes del administrador.
 */
export interface LugarSinMapear {
  texto: string;
  cantidad: number;
  ultimo: Date;
}

export const locationRepository = {
  /** Todo el mapa de la comunidad, en orden de presentación. */
  async listByTenant(tenantId: string): Promise<Location[]> {
    return db
      .select()
      .from(locations)
      .where(eq(locations.tenantId, tenantId))
      .orderBy(asc(locations.sortOrder), asc(locations.name));
  },

  async listActivas(tenantId: string): Promise<Location[]> {
    return db
      .select()
      .from(locations)
      .where(and(eq(locations.tenantId, tenantId), eq(locations.isActive, true)))
      .orderBy(asc(locations.sortOrder), asc(locations.name));
  },

  async getById(id: string): Promise<Location | null> {
    const [row] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
    return row ?? null;
  },

  /**
   * Busca por clave de matching dentro del mismo padre. Es lo que impide
   * que "Torre 1" y "torre uno" entren dos veces.
   */
  async findByNormalized(
    tenantId: string,
    normalized: string,
    parentId: string | null,
  ): Promise<Location | null> {
    const [row] = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.tenantId, tenantId),
          eq(locations.normalized, normalized),
          parentId === null ? isNull(locations.parentId) : eq(locations.parentId, parentId),
        ),
      )
      .limit(1);
    return row ?? null;
  },

  async countByTenant(tenantId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(locations)
      .where(eq(locations.tenantId, tenantId));
    return row?.n ?? 0;
  },

  async create(data: NewLocation): Promise<Location> {
    const [row] = await db.insert(locations).values(data).returning();
    if (!row) throw new Error('No se pudo crear el lugar.');
    return row;
  },

  /** Alta en lote — el onboarding carga una torre con sus N pisos de una. */
  async createMany(data: NewLocation[]): Promise<Location[]> {
    if (data.length === 0) return [];
    return db.insert(locations).values(data).returning();
  },

  async update(id: string, data: Partial<NewLocation>): Promise<Location> {
    const [row] = await db.update(locations).set(data).where(eq(locations.id, id)).returning();
    if (!row) throw new Error('Lugar no encontrado.');
    return row;
  },

  async delete(id: string): Promise<void> {
    await db.delete(locations).where(eq(locations.id, id));
  },

  /** Cuántos reportes apuntan acá. Se consulta antes de ofrecer borrar. */
  async countReportes(locationId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(incidentReports)
      .where(eq(incidentReports.locationId, locationId));
    return row?.n ?? 0;
  },

  /**
   * Lugares mencionados en reportes que no están en el mapa, agrupados y
   * ordenados por frecuencia.
   *
   * El agrupado es por texto crudo a propósito: la normalización vive en
   * `lib/location-types.ts` (incluye palabras dictadas como "uno" → "1") y
   * replicarla en SQL sería tener dos definiciones de lo mismo. El service
   * consolida las variantes en memoria, que para este volumen sobra.
   */
  async listSinMapear(tenantId: string): Promise<LugarSinMapear[]> {
    const rows = await db
      .select({
        texto: incidentReports.location,
        cantidad: sql<number>`count(*)::int`,
        ultimo: sql<Date>`max(${incidentReports.createdAt})`,
      })
      .from(incidentReports)
      .where(
        and(
          eq(incidentReports.tenantId, tenantId),
          isNull(incidentReports.locationId),
          isNotNull(incidentReports.location),
          ne(incidentReports.location, ''),
        ),
      )
      .groupBy(incidentReports.location)
      .orderBy(desc(sql`count(*)`));

    return rows
      .filter((r): r is { texto: string; cantidad: number; ultimo: Date } => Boolean(r.texto))
      .map((r) => ({ texto: r.texto, cantidad: r.cantidad, ultimo: new Date(r.ultimo) }));
  },

  /**
   * Engancha al mapa los reportes viejos que mencionaban este lugar en
   * texto libre. Sin esto, crear "Torre 3" desde la lista de pendientes
   * dejaría afuera los ocho reportes que provocaron crearla.
   *
   * También unifica el texto: si no, "torre 3" y "Torre 3" seguirían
   * contando como dos filas distintas en la vista de patrones, que es la
   * única razón por la que existe el mapa.
   */
  async mapearReportes(
    tenantId: string,
    textos: string[],
    locationId: string,
    rutaCompleta: string,
  ): Promise<number> {
    if (textos.length === 0) return 0;
    const rows = await db
      .update(incidentReports)
      .set({ locationId, location: rutaCompleta })
      .where(
        and(
          eq(incidentReports.tenantId, tenantId),
          isNull(incidentReports.locationId),
          inArray(incidentReports.location, textos),
        ),
      )
      .returning({ id: incidentReports.id });
    return rows.length;
  },
};
