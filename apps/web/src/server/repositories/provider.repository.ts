import 'server-only';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { db, providers, type NewProvider, type Provider } from '@a-la-mano/db';

export interface ProviderSearchFilters {
  query?: string;
  categoryId?: string;
  city?: string;
  limit?: number;
}

export const providerRepository = {
  async getById(id: string): Promise<Provider | null> {
    const [row] = await db.select().from(providers).where(eq(providers.id, id)).limit(1);
    return row ?? null;
  },

  async getByPhoneNormalized(phoneNormalized: string): Promise<Provider | null> {
    const [row] = await db
      .select()
      .from(providers)
      .where(eq(providers.phoneNormalized, phoneNormalized))
      .limit(1);
    return row ?? null;
  },

  async search(filters: ProviderSearchFilters = {}): Promise<Provider[]> {
    const { query, categoryId, city, limit = 50 } = filters;
    const conditions = [];
    if (query && query.trim().length > 0) {
      const pattern = `%${query.trim()}%`;
      conditions.push(or(ilike(providers.name, pattern), ilike(providers.description, pattern)));
    }
    if (categoryId) conditions.push(eq(providers.categoryId, categoryId));
    if (city) conditions.push(eq(providers.city, city));

    const where = conditions.length === 0 ? undefined : and(...conditions);
    return db
      .select()
      .from(providers)
      .where(where)
      .orderBy(providers.name)
      .limit(limit);
  },

  async create(data: NewProvider): Promise<Provider> {
    const [row] = await db.insert(providers).values(data).returning();
    if (!row) throw new Error('No se pudo crear el provider.');
    return row;
  },

  async update(id: string, data: Partial<NewProvider>): Promise<Provider> {
    const [row] = await db
      .update(providers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(providers.id, id))
      .returning();
    if (!row) throw new Error('Provider no encontrado.');
    return row;
  },

  async countAll(): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(providers);
    return row?.count ?? 0;
  },
};
