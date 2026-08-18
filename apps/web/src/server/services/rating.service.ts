import 'server-only';
import { z } from 'zod';
import { ratingRepository } from '@/server/repositories/rating.repository';
import { communityProviderRepository } from '@/server/repositories/community-provider.repository';
import { auditService } from './audit.service';
import { assertRole, assertTenantMember } from '@/lib/auth/guards';

const upsertRatingSchema = z.object({
  communityProviderId: z.string().uuid(),
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
});

export type UpsertRatingInput = z.input<typeof upsertRatingSchema>;

export const ratingService = {
  async upsert(tenantId: string, input: UpsertRatingInput) {
    const { user } = await assertTenantMember(tenantId);
    const parsed = upsertRatingSchema.parse(input);

    // Verificar que el community_provider pertenece al tenant — si no, abort.
    const cp = await communityProviderRepository.getById(parsed.communityProviderId);
    if (!cp || cp.tenantId !== tenantId) {
      throw new Error('Proveedor no encontrado en esta comunidad.');
    }

    const rating = await ratingRepository.upsert({
      tenantId,
      communityProviderId: parsed.communityProviderId,
      userId: user.id,
      stars: parsed.stars,
      comment: parsed.comment ?? null,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'rating.upserted',
      resourceType: 'rating',
      resourceId: rating.id,
      metadata: { stars: parsed.stars },
    });

    return rating;
  },

  async listForCommunityProvider(
    tenantId: string,
    communityProviderId: string,
    options: { includeHidden?: boolean } = {},
  ) {
    await assertTenantMember(tenantId);
    return ratingRepository.listByCommunityProvider(communityProviderId, options);
  },

  async getMyRating(tenantId: string, communityProviderId: string) {
    const { user } = await assertTenantMember(tenantId);
    return ratingRepository.getByUserAndCommunityProvider(user.id, communityProviderId);
  },

  async hide(tenantId: string, ratingId: string, reason: string | null) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const rating = await ratingRepository.hide(ratingId, user.id, reason);
    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'rating.hidden',
      resourceType: 'rating',
      resourceId: ratingId,
      metadata: { reason },
    });
    return rating;
  },

  async unhide(tenantId: string, ratingId: string) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const rating = await ratingRepository.unhide(ratingId);
    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'rating.unhidden',
      resourceType: 'rating',
      resourceId: ratingId,
    });
    return rating;
  },
};

export { upsertRatingSchema };
