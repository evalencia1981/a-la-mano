'use server';

import { revalidatePath } from 'next/cache';
import { suggestionService, type CreateSuggestionInput } from '@/server/services/suggestion.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { fail, ok, type ActionResult } from './result';
import type { Suggestion } from '@a-la-mano/db';

async function revalidateSuggestions(tenantId: string) {
  const tenant = await tenantRepository.findById(tenantId);
  if (tenant) {
    revalidatePath(`/${tenant.slug}/admin/suggestions`);
    revalidatePath(`/${tenant.slug}/my-suggestions`);
    revalidatePath(`/${tenant.slug}/suggest`);
  }
}

function readSuggestionInput(formData: FormData): CreateSuggestionInput {
  return {
    name: String(formData.get('name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    categoryId: String(formData.get('categoryId') ?? ''),
    city: String(formData.get('city') ?? ''),
    neighborhood: (formData.get('neighborhood') as string) || null,
    isWhatsapp: formData.get('isWhatsapp') === 'on' || formData.get('isWhatsapp') === 'true',
    whatsappNumber: (formData.get('whatsappNumber') as string) || null,
    instagramHandle: (formData.get('instagramHandle') as string) || null,
    description: (formData.get('description') as string) || null,
    memberNote: (formData.get('memberNote') as string) || null,
  };
}

export async function createSuggestionAction(
  tenantId: string,
  formData: FormData,
): Promise<ActionResult<{ suggestion: Suggestion }>> {
  try {
    const suggestion = await suggestionService.create(tenantId, readSuggestionInput(formData));
    await revalidateSuggestions(tenantId);
    return ok({ suggestion });
  } catch (error) {
    return fail(error);
  }
}

export async function approveSuggestionAction(
  tenantId: string,
  suggestionId: string,
): Promise<ActionResult<{ communityProviderId: string }>> {
  try {
    const { communityProvider } = await suggestionService.approve(tenantId, suggestionId);
    await revalidateSuggestions(tenantId);
    return ok({ communityProviderId: communityProvider.id });
  } catch (error) {
    return fail(error);
  }
}

export async function rejectSuggestionAction(
  tenantId: string,
  suggestionId: string,
  reason: string,
): Promise<ActionResult<void>> {
  try {
    await suggestionService.reject(tenantId, suggestionId, reason);
    await revalidateSuggestions(tenantId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
