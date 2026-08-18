import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  db,
  incidentReports,
  profiles,
  type IncidentReport,
  type NewIncidentReport,
} from '@a-la-mano/db';

export interface FilaReporte {
  reporte: IncidentReport;
  /** Quién reportó. Solo se expone a la administración. */
  reportante: { id: string; fullName: string | null; email: string } | null;
}

/** Un patrón: mismo tipo, mismo lugar, varias veces. */
export interface PatronReportes {
  type: string;
  location: string | null;
  cantidad: number;
  sinResolver: number;
  ultimo: Date;
}

export const incidentRepository = {
  async create(data: NewIncidentReport): Promise<IncidentReport> {
    const [row] = await db.insert(incidentReports).values(data).returning();
    if (!row) throw new Error('No se pudo registrar el reporte.');
    return row;
  },

  async listByTenant(tenantId: string, limit = 100): Promise<FilaReporte[]> {
    const rows = await db
      .select({ reporte: incidentReports, reportante: profiles })
      .from(incidentReports)
      .leftJoin(profiles, eq(profiles.id, incidentReports.reportedBy))
      .where(eq(incidentReports.tenantId, tenantId))
      .orderBy(desc(incidentReports.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      reporte: r.reporte,
      reportante: r.reportante
        ? { id: r.reportante.id, fullName: r.reportante.fullName, email: r.reportante.email }
        : null,
    }));
  },

  async listByUser(tenantId: string, userId: string, limit = 30): Promise<IncidentReport[]> {
    return db
      .select()
      .from(incidentReports)
      .where(and(eq(incidentReports.tenantId, tenantId), eq(incidentReports.reportedBy, userId)))
      .orderBy(desc(incidentReports.createdAt))
      .limit(limit);
  },

  /**
   * Agrupa por tipo y lugar. Es lo que convierte reclamos sueltos en algo
   * accionable: "8 reportes de menores en la rampa, 6 sin resolver".
   */
  async listPatrones(tenantId: string): Promise<PatronReportes[]> {
    const rows = await db
      .select({
        type: incidentReports.type,
        location: incidentReports.location,
        cantidad: sql<number>`count(*)::int`,
        sinResolver: sql<number>`count(*) filter (where ${incidentReports.status} <> 'resuelto')::int`,
        ultimo: sql<Date>`max(${incidentReports.createdAt})`,
      })
      .from(incidentReports)
      .where(eq(incidentReports.tenantId, tenantId))
      .groupBy(incidentReports.type, incidentReports.location)
      .orderBy(desc(sql`count(*)`));

    return rows.map((r) => ({
      type: r.type,
      location: r.location,
      cantidad: r.cantidad,
      sinResolver: r.sinResolver,
      ultimo: new Date(r.ultimo),
    }));
  },

  async countSinResolver(tenantId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(incidentReports)
      .where(
        and(eq(incidentReports.tenantId, tenantId), sql`${incidentReports.status} <> 'resuelto'`),
      );
    return row?.n ?? 0;
  },

  async update(id: string, data: Partial<NewIncidentReport>): Promise<IncidentReport> {
    const [row] = await db
      .update(incidentReports)
      .set(data)
      .where(eq(incidentReports.id, id))
      .returning();
    if (!row) throw new Error('Reporte no encontrado.');
    return row;
  },

  async getById(id: string): Promise<IncidentReport | null> {
    const [row] = await db
      .select()
      .from(incidentReports)
      .where(eq(incidentReports.id, id))
      .limit(1);
    return row ?? null;
  },
};
