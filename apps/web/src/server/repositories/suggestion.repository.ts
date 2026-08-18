import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db, suggestions, type NewSuggestion, type Suggestion } from '@a-la-mano/db';

export const suggestionRepository = {
  async getById(id: string): Promise<Suggestion | null> {
    const [row] = await db.select().from(suggestions).where(eq(suggestions.id, id)).limit(1);
    return row ?? null;
  },

  async listByTenant(tenantId: string): Promise<Suggestion[]> {
    return db
      .select()
      .from(suggestions)
      .where(eq(suggestions.tenantId, tenantId))
      .orderBy(desc(suggestions.createdAt));
  },

  async listPending(tenantId: string): Promise<Suggestion[]> {
    return db
      .select()
      .from(suggestions)
      .where(and(eq(suggestions.tenantId, tenantId), eq(suggestions.status, 'pending')))
      .orderBy(desc(suggestions.createdAt));
  },

  async listByUser(userId: string): Promise<Suggestion[]> {
    return db
      .select()
      .from(suggestions)
      .where(eq(suggestions.suggestedBy, userId))
      .orderBy(desc(suggestions.createdAt));
  },

  async create(data: NewSuggestion): Promise<Suggestion> {
    const [row] = await db.insert(suggestions).values(data).returning();
    if (!row) throw new Error('No se pudo crear la sugerencia.');
    return row;
  },

  async update(id: string, data: Partial<NewSuggestion>): Promise<Suggestion> {
    const [row] = await db
      .update(suggestions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(suggestions.id, id))
      .returning();
    if (!row) throw new Error('Sugerencia no encontrada.');
    return row;
  },
};
