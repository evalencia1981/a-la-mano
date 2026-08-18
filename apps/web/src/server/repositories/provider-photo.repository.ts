import 'server-only';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db, providerPhotos, type NewProviderPhoto, type ProviderPhoto } from '@a-la-mano/db';

export const providerPhotoRepository = {
  async listByProvider(providerId: string): Promise<ProviderPhoto[]> {
    return db
      .select()
      .from(providerPhotos)
      .where(eq(providerPhotos.providerId, providerId))
      .orderBy(asc(providerPhotos.displayOrder));
  },

  async getById(id: string): Promise<ProviderPhoto | null> {
    const [row] = await db.select().from(providerPhotos).where(eq(providerPhotos.id, id)).limit(1);
    return row ?? null;
  },

  async countByProvider(providerId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(providerPhotos)
      .where(eq(providerPhotos.providerId, providerId));
    return row?.count ?? 0;
  },

  async create(data: NewProviderPhoto): Promise<ProviderPhoto> {
    const [row] = await db.insert(providerPhotos).values(data).returning();
    if (!row) throw new Error('No se pudo crear la foto.');
    return row;
  },

  async delete(id: string): Promise<ProviderPhoto> {
    const [row] = await db.delete(providerPhotos).where(eq(providerPhotos.id, id)).returning();
    if (!row) throw new Error('Foto no encontrada.');
    return row;
  },

  async setPrimary(providerId: string, photoId: string): Promise<void> {
    // Quitar el primary actual y poner el nuevo en una sola transacción.
    await db.transaction(async (tx) => {
      await tx
        .update(providerPhotos)
        .set({ isPrimary: false })
        .where(and(eq(providerPhotos.providerId, providerId), eq(providerPhotos.isPrimary, true)));
      await tx
        .update(providerPhotos)
        .set({ isPrimary: true })
        .where(eq(providerPhotos.id, photoId));
    });
  },

  async updateOrder(id: string, displayOrder: number): Promise<void> {
    await db.update(providerPhotos).set({ displayOrder }).where(eq(providerPhotos.id, id));
  },

  async firstByProvider(providerId: string): Promise<ProviderPhoto | null> {
    const [row] = await db
      .select()
      .from(providerPhotos)
      .where(eq(providerPhotos.providerId, providerId))
      .orderBy(asc(providerPhotos.displayOrder))
      .limit(1);
    return row ?? null;
  },
};
