import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db, profiles, ratings, type NewRating, type Rating } from '@a-la-mano/db';

export interface RatingWithAuthor {
  rating: Rating;
  authorName: string | null;
  authorEmail: string;
  authorAvatarUrl: string | null;
  /** Status del miembro en el tenant: 'active' | 'inactive'. */
  memberStatus: string | null;
}

export const ratingRepository = {
  async listByCommunityProvider(
    communityProviderId: string,
    options: { includeHidden?: boolean } = {},
  ): Promise<RatingWithAuthor[]> {
    const { includeHidden = false } = options;
    const conditions = [eq(ratings.communityProviderId, communityProviderId)];
    if (!includeHidden) conditions.push(eq(ratings.isHidden, false));

    // Levantamos `memberStatus` desde la vista ratings_with_member_status sería
    // ideal, pero acá lo derivamos uniendo con tenant_members para evitar
    // dependencia del modelo de la vista en el schema TS.
    const rows = await db
      .select({
        rating: ratings,
        authorName: profiles.fullName,
        authorEmail: profiles.email,
        authorAvatarUrl: profiles.avatarUrl,
        memberStatus: sql<string | null>`(
          select status from core.tenant_members
          where tenant_id = ${ratings.tenantId} and user_id = ${ratings.userId}
          limit 1
        )`,
      })
      .from(ratings)
      .innerJoin(profiles, eq(profiles.id, ratings.userId))
      .where(and(...conditions))
      .orderBy(desc(ratings.createdAt));
    return rows;
  },

  async getByUserAndCommunityProvider(
    userId: string,
    communityProviderId: string,
  ): Promise<Rating | null> {
    const [row] = await db
      .select()
      .from(ratings)
      .where(
        and(eq(ratings.userId, userId), eq(ratings.communityProviderId, communityProviderId)),
      )
      .limit(1);
    return row ?? null;
  },

  async upsert(data: NewRating): Promise<Rating> {
    const [row] = await db
      .insert(ratings)
      .values(data)
      .onConflictDoUpdate({
        target: [ratings.tenantId, ratings.communityProviderId, ratings.userId],
        set: {
          stars: data.stars,
          comment: data.comment,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!row) throw new Error('No se pudo upsertear el rating.');
    return row;
  },

  async hide(
    id: string,
    hiddenBy: string,
    reason: string | null,
  ): Promise<Rating> {
    const [row] = await db
      .update(ratings)
      .set({
        isHidden: true,
        hiddenBy,
        hiddenAt: new Date(),
        hiddenReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(ratings.id, id))
      .returning();
    if (!row) throw new Error('Rating no encontrado.');
    return row;
  },

  async unhide(id: string): Promise<Rating> {
    const [row] = await db
      .update(ratings)
      .set({
        isHidden: false,
        hiddenBy: null,
        hiddenAt: null,
        hiddenReason: null,
        updatedAt: new Date(),
      })
      .where(eq(ratings.id, id))
      .returning();
    if (!row) throw new Error('Rating no encontrado.');
    return row;
  },
};
