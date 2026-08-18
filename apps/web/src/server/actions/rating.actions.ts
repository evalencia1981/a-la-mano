'use server';

import { revalidatePath } from 'next/cache';
import { ratingService } from '@/server/services/rating.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { fail, ok, type ActionResult } from './result';
import type { Rating } from '@a-la-mano/db';

async function revalidateProvider(tenantId: string, communityProviderId: string) {
  const tenant = await tenantRepository.findById(tenantId);
  if (tenant) {
    revalidatePath(`/${tenant.slug}/directory/provider/${communityProviderId}`);
  }
}

export async function submitRatingAction(
  tenantId: string,
  formData: FormData,
): Promise<ActionResult<{ rating: Rating }>> {
  try {
    const communityProviderId = String(formData.get('communityProviderId') ?? '');
    const rating = await ratingService.upsert(tenantId, {
      communityProviderId,
      stars: Number(formData.get('stars') ?? 0),
      comment: (formData.get('comment') as string) || null,
    });
    await revalidateProvider(tenantId, communityProviderId);
    return ok({ rating });
  } catch (error) {
    return fail(error);
  }
}

export async function hideRatingAction(
  tenantId: string,
  ratingId: string,
  reason: string | null,
): Promise<ActionResult<void>> {
  try {
    await ratingService.hide(tenantId, ratingId, reason);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function unhideRatingAction(
  tenantId: string,
  ratingId: string,
): Promise<ActionResult<void>> {
  try {
    await ratingService.unhide(tenantId, ratingId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
