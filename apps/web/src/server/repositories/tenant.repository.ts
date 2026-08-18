import 'server-only';
import { db, tenants, type NewTenant, type Tenant } from '@a-la-mano/db';
import { eq } from 'drizzle-orm';

/**
 * Repositorio puro de `tenants`. Acceso directo a DB, sin lógica de negocio.
 * Las validaciones, autorización y orquestación viven en `tenant.service.ts`.
 */
export const tenantRepository = {
  async findById(id: string): Promise<Tenant | null> {
    const [row] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return row ?? null;
  },

  async findBySlug(slug: string): Promise<Tenant | null> {
    const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return row ?? null;
  },

  /** Busca por el código del enlace de ingreso. Case-insensitive. */
  async findByJoinCode(code: string): Promise<Tenant | null> {
    const [row] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.joinCode, code.trim().toUpperCase()))
      .limit(1);
    return row ?? null;
  },

  async create(data: NewTenant): Promise<Tenant> {
    const [row] = await db.insert(tenants).values(data).returning();
    if (!row) throw new Error('No se pudo crear el tenant.');
    return row;
  },

  async update(id: string, data: Partial<NewTenant>): Promise<Tenant> {
    const [row] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    if (!row) throw new Error('Tenant no encontrado.');
    return row;
  },
};
