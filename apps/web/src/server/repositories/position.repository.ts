import 'server-only';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db, positions, tasks, type NewPosition, type Position } from '@a-la-mano/db';

export const positionRepository = {
  async listByTenant(tenantId: string): Promise<Position[]> {
    return db
      .select()
      .from(positions)
      .where(eq(positions.tenantId, tenantId))
      .orderBy(asc(positions.sortOrder), asc(positions.name));
  },

  async listActivos(tenantId: string): Promise<Position[]> {
    return db
      .select()
      .from(positions)
      .where(and(eq(positions.tenantId, tenantId), eq(positions.isActive, true)))
      .orderBy(asc(positions.sortOrder), asc(positions.name));
  },

  async getById(id: string): Promise<Position | null> {
    const [row] = await db.select().from(positions).where(eq(positions.id, id)).limit(1);
    return row ?? null;
  },

  async findByNormalized(tenantId: string, normalized: string): Promise<Position | null> {
    const [row] = await db
      .select()
      .from(positions)
      .where(and(eq(positions.tenantId, tenantId), eq(positions.normalized, normalized)))
      .limit(1);
    return row ?? null;
  },

  async create(data: NewPosition): Promise<Position> {
    const [row] = await db.insert(positions).values(data).returning();
    if (!row) throw new Error('No se pudo crear el puesto.');
    return row;
  },

  async update(id: string, data: Partial<NewPosition>): Promise<Position> {
    const [row] = await db.update(positions).set(data).where(eq(positions.id, id)).returning();
    if (!row) throw new Error('Puesto no encontrado.');
    return row;
  },

  async delete(id: string): Promise<void> {
    await db.delete(positions).where(eq(positions.id, id));
  },

  /** Cuántas tareas le apuntan. Se consulta antes de ofrecer borrar. */
  async countTareas(positionId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tasks)
      .where(eq(tasks.positionId, positionId));
    return row?.n ?? 0;
  },

  /** Pendientes abiertos por puesto, para la bandeja agrupada. */
  async contarAbiertasPorPuesto(tenantId: string): Promise<Map<string, number>> {
    const rows = await db
      .select({ positionId: tasks.positionId, n: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(eq(tasks.tenantId, tenantId), sql`${tasks.status} <> 'resuelto'`))
      .groupBy(tasks.positionId);

    const mapa = new Map<string, number>();
    for (const r of rows) if (r.positionId) mapa.set(r.positionId, r.n);
    return mapa;
  },
};
