import 'server-only';
import { and, asc, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import {
  communityProviders,
  db,
  positions,
  providers,
  taskDispatches,
  taskUpdates,
  tasks,
  tenants,
  type NewTask,
  type NewTaskDispatch,
  type NewTaskUpdate,
  type Position,
  type Task,
  type TaskDispatch,
  type TaskUpdate,
} from '@a-la-mano/db';

/** Una tarea con su destinatario, sea puesto interno o proveedor externo. */
export interface FilaTarea {
  tarea: Task;
  puesto: Position | null;
  /** Solo el nombre: la bandeja no necesita la ficha entera del proveedor. */
  proveedor: { id: string; name: string } | null;
}

/** Todo lo que necesita la página pública del enlace, en una sola consulta. */
export interface TareaPorToken {
  despacho: TaskDispatch;
  tarea: Task;
  puesto: Position | null;
  comunidad: { id: string; name: string };
}

export const taskRepository = {
  async create(data: NewTask): Promise<Task> {
    const [row] = await db.insert(tasks).values(data).returning();
    if (!row) throw new Error('No se pudo guardar el pendiente.');
    return row;
  },

  async getById(id: string): Promise<Task | null> {
    const [row] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return row ?? null;
  },

  async update(id: string, data: Partial<NewTask>): Promise<Task> {
    const [row] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    if (!row) throw new Error('Pendiente no encontrado.');
    return row;
  },

  async delete(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  },

  /**
   * La bandeja: lo abierto primero y lo más nuevo arriba.
   *
   * Lo resuelto no se filtra acá sino que se ordena al fondo — esconderlo
   * del todo obliga a cambiar de pantalla para confirmar que algo se hizo,
   * que es justo lo que él quiere poder ver de un vistazo.
   */
  async listBandeja(tenantId: string, limit = 200): Promise<FilaTarea[]> {
    const rows = await db
      .select({ tarea: tasks, puesto: positions, proveedor: providers })
      .from(tasks)
      .leftJoin(positions, eq(positions.id, tasks.positionId))
      .leftJoin(communityProviders, eq(communityProviders.id, tasks.communityProviderId))
      .leftJoin(providers, eq(providers.id, communityProviders.providerId))
      .where(eq(tasks.tenantId, tenantId))
      .orderBy(
        asc(sql`case when ${tasks.status} = 'resuelto' then 1 else 0 end`),
        desc(tasks.createdAt),
      )
      .limit(limit);

    return rows.map((r) => ({
      tarea: r.tarea,
      puesto: r.puesto,
      proveedor: r.proveedor ? { id: r.proveedor.id, name: r.proveedor.name } : null,
    }));
  },

  /** "Qué reporté hoy" — la consulta que pidió explícitamente. */
  async listPorRango(tenantId: string, desde: Date, hasta: Date): Promise<FilaTarea[]> {
    const rows = await db
      .select({ tarea: tasks, puesto: positions, proveedor: providers })
      .from(tasks)
      .leftJoin(positions, eq(positions.id, tasks.positionId))
      .leftJoin(communityProviders, eq(communityProviders.id, tasks.communityProviderId))
      .leftJoin(providers, eq(providers.id, communityProviders.providerId))
      .where(
        and(eq(tasks.tenantId, tenantId), gte(tasks.createdAt, desde), lt(tasks.createdAt, hasta)),
      )
      .orderBy(desc(tasks.createdAt));

    return rows.map((r) => ({
      tarea: r.tarea,
      puesto: r.puesto,
      proveedor: r.proveedor ? { id: r.proveedor.id, name: r.proveedor.name } : null,
    }));
  },

  async countAbiertas(tenantId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(eq(tasks.tenantId, tenantId), sql`${tasks.status} <> 'resuelto'`));
    return row?.n ?? 0;
  },

  /** Pendientes sin puesto asignado: la lista de "esto todavía no tiene dueño". */
  async countSinAsignar(tenantId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.tenantId, tenantId),
          isNull(tasks.positionId),
          sql`${tasks.status} <> 'resuelto'`,
        ),
      );
    return row?.n ?? 0;
  },

  /* ----------------------------- bitácora ----------------------------- */

  async addUpdate(data: NewTaskUpdate): Promise<TaskUpdate> {
    const [row] = await db.insert(taskUpdates).values(data).returning();
    if (!row) throw new Error('No se pudo registrar el movimiento.');
    return row;
  },

  async listUpdates(taskId: string): Promise<TaskUpdate[]> {
    return db
      .select()
      .from(taskUpdates)
      .where(eq(taskUpdates.taskId, taskId))
      .orderBy(asc(taskUpdates.createdAt));
  },

  /* ----------------------------- despachos ---------------------------- */

  async createDispatch(data: NewTaskDispatch): Promise<TaskDispatch> {
    const [row] = await db.insert(taskDispatches).values(data).returning();
    if (!row) throw new Error('No se pudo generar el enlace.');
    return row;
  },

  async listDispatches(taskId: string): Promise<TaskDispatch[]> {
    return db
      .select()
      .from(taskDispatches)
      .where(eq(taskDispatches.taskId, taskId))
      .orderBy(desc(taskDispatches.createdAt));
  },

  /**
   * Resuelve el token de la URL pública.
   *
   * Trae la comunidad junto con la tarea porque la página del enlace la
   * necesita para decir de dónde viene el pendiente — quien lo recibe
   * trabaja para varias unidades y sin eso no sabe de cuál le hablan.
   */
  async findByToken(token: string): Promise<TareaPorToken | null> {
    const [row] = await db
      .select({
        despacho: taskDispatches,
        tarea: tasks,
        puesto: positions,
        comunidad: { id: tenants.id, name: tenants.name },
      })
      .from(taskDispatches)
      .innerJoin(tasks, eq(tasks.id, taskDispatches.taskId))
      .innerJoin(tenants, eq(tenants.id, taskDispatches.tenantId))
      .leftJoin(positions, eq(positions.id, taskDispatches.positionId))
      .where(eq(taskDispatches.token, token))
      .limit(1);

    return row ?? null;
  },

  async revokeDispatch(id: string, cuando: Date): Promise<void> {
    await db.update(taskDispatches).set({ revokedAt: cuando }).where(eq(taskDispatches.id, id));
  },
};
