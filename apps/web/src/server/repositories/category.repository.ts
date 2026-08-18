import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { categories, db, type Category, type NewCategory } from '@a-la-mano/db';

export const categoryRepository = {
  async listAll(): Promise<Category[]> {
    return db.select().from(categories).orderBy(asc(categories.displayOrder));
  },

  async listActive(): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.displayOrder));
  },

  async getById(id: string): Promise<Category | null> {
    const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return row ?? null;
  },

  async getBySlug(slug: string): Promise<Category | null> {
    const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return row ?? null;
  },

  async create(data: NewCategory): Promise<Category> {
    const [row] = await db.insert(categories).values(data).returning();
    if (!row) throw new Error('No se pudo crear la categoría.');
    return row;
  },

  async update(id: string, data: Partial<NewCategory>): Promise<Category> {
    const [row] = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    if (!row) throw new Error('Categoría no encontrada.');
    return row;
  },

  async deactivate(id: string): Promise<Category> {
    return this.update(id, { isActive: false });
  },
};
