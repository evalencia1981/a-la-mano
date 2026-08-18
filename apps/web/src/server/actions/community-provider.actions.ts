'use server';

import { revalidatePath } from 'next/cache';
import { communityProviderService, type AddProviderInput } from '@/server/services/community-provider.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { fail, ok, type ActionResult } from './result';
import type { CommunityProvider, Provider } from '@a-la-mano/db';

async function revalidateTenant(tenantId: string) {
  const tenant = await tenantRepository.findById(tenantId);
  if (tenant) {
    revalidatePath(`/${tenant.slug}`);
    revalidatePath(`/${tenant.slug}/directory`);
    revalidatePath(`/${tenant.slug}/admin/providers`);
    revalidatePath(`/${tenant.slug}/admin/recomendados`);
  }
}

/**
 * Suma a la comunidad un proveedor recomendado desde una unidad cercana.
 * Es siempre una decisión de un admin: nada entra al directorio solo.
 */
export async function adoptarRecomendadoAction(
  tenantId: string,
  providerId: string,
): Promise<ActionResult<{ communityProvider: CommunityProvider }>> {
  try {
    const cp = await communityProviderService.adoptarRecomendado(tenantId, providerId);
    await revalidateTenant(tenantId);
    return ok({ communityProvider: cp });
  } catch (error) {
    return fail(error);
  }
}

function readAddProviderInput(formData: FormData): AddProviderInput {
  return {
    name: String(formData.get('name') ?? ''),
    categoryId: String(formData.get('categoryId') ?? ''),
    city: String(formData.get('city') ?? ''),
    neighborhood: (formData.get('neighborhood') as string) || null,
    phone: String(formData.get('phone') ?? ''),
    isWhatsapp: formData.get('isWhatsapp') === 'on' || formData.get('isWhatsapp') === 'true',
    whatsappNumber: (formData.get('whatsappNumber') as string) || null,
    instagramHandle: (formData.get('instagramHandle') as string) || null,
    websiteUrl: (formData.get('websiteUrl') as string) || null,
    description: (formData.get('description') as string) || null,
    localNotes: (formData.get('localNotes') as string) || null,
  };
}

export async function addProviderToCommunityAction(
  tenantId: string,
  formData: FormData,
): Promise<ActionResult<{ communityProvider: CommunityProvider; provider: Provider; wasCreated: boolean }>> {
  try {
    const data = await communityProviderService.addProvider(tenantId, readAddProviderInput(formData));
    await revalidateTenant(tenantId);
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function removeProviderFromCommunityAction(
  tenantId: string,
  communityProviderId: string,
): Promise<ActionResult<void>> {
  try {
    await communityProviderService.remove(tenantId, communityProviderId);
    await revalidateTenant(tenantId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function restoreProviderAction(
  tenantId: string,
  communityProviderId: string,
): Promise<ActionResult<void>> {
  try {
    await communityProviderService.restore(tenantId, communityProviderId);
    await revalidateTenant(tenantId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function updateLocalNotesAction(
  tenantId: string,
  communityProviderId: string,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const notes = (formData.get('localNotes') as string) || null;
    await communityProviderService.updateLocalNotes(tenantId, communityProviderId, notes);
    await revalidateTenant(tenantId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
