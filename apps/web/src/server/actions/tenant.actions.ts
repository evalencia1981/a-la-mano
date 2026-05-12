'use server';

import { revalidatePath } from 'next/cache';
import { tenantService } from '@/server/services/tenant.service';
import { fail, ok, type ActionResult } from './result';
import type { Tenant } from '@evalencia-stack/db';

export async function createTenantAction(
  formData: FormData,
): Promise<ActionResult<{ tenant: Tenant }>> {
  try {
    const tenant = await tenantService.create({
      name: String(formData.get('name') ?? ''),
      slug: String(formData.get('slug') ?? ''),
    });
    revalidatePath('/select-tenant');
    return ok({ tenant });
  } catch (error) {
    return fail(error);
  }
}

export async function updateTenantAction(
  tenantId: string,
  formData: FormData,
): Promise<ActionResult<{ tenant: Tenant }>> {
  try {
    const tenant = await tenantService.update(tenantId, {
      name: (formData.get('name') as string) || undefined,
      defaultLanguage: (formData.get('defaultLanguage') as string) || undefined,
      timezone: (formData.get('timezone') as string) || undefined,
    });
    revalidatePath(`/${tenant.slug}/settings`);
    return ok({ tenant });
  } catch (error) {
    return fail(error);
  }
}

export async function updateBrandingAction(
  tenantId: string,
  formData: FormData,
): Promise<ActionResult<{ tenant: Tenant }>> {
  try {
    const tenant = await tenantService.updateBranding(tenantId, {
      logoUrl: (formData.get('logoUrl') as string) || null,
      primaryColor: (formData.get('primaryColor') as string) || undefined,
      secondaryColor: (formData.get('secondaryColor') as string) || undefined,
    });
    revalidatePath(`/${tenant.slug}`);
    revalidatePath(`/${tenant.slug}/settings/branding`);
    return ok({ tenant });
  } catch (error) {
    return fail(error);
  }
}
