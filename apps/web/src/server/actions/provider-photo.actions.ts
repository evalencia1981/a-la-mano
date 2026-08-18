'use server';

import { revalidatePath } from 'next/cache';
import { providerPhotoService } from '@/server/services/provider-photo.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { fail, ok, type ActionResult } from './result';
import type { ProviderPhoto } from '@a-la-mano/db';

async function revalidateProviderPaths(tenantId: string | null, providerId: string) {
  if (!tenantId) return;
  const tenant = await tenantRepository.findById(tenantId);
  if (tenant) {
    revalidatePath(`/${tenant.slug}/directory/provider/${providerId}`);
    revalidatePath(`/${tenant.slug}/admin/providers/${providerId}`);
  }
}

export async function uploadProviderPhotoAction(
  tenantId: string,
  providerId: string,
  formData: FormData,
): Promise<ActionResult<{ photo: ProviderPhoto }>> {
  try {
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return fail(new Error('No se recibió un archivo válido.'));
    }
    const altText = (formData.get('altText') as string) || undefined;
    const result = await providerPhotoService.upload(providerId, file, altText);
    await revalidateProviderPaths(tenantId, providerId);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteProviderPhotoAction(
  tenantId: string,
  providerId: string,
  photoId: string,
): Promise<ActionResult<void>> {
  try {
    await providerPhotoService.delete(photoId);
    await revalidateProviderPaths(tenantId, providerId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function setPrimaryProviderPhotoAction(
  tenantId: string,
  providerId: string,
  photoId: string,
): Promise<ActionResult<void>> {
  try {
    await providerPhotoService.setPrimary(providerId, photoId);
    await revalidateProviderPaths(tenantId, providerId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function reorderProviderPhotosAction(
  tenantId: string,
  providerId: string,
  photoIds: string[],
): Promise<ActionResult<void>> {
  try {
    await providerPhotoService.reorder(providerId, photoIds);
    await revalidateProviderPaths(tenantId, providerId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
