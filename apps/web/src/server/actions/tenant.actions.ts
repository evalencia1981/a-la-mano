'use server';

import { revalidatePath } from 'next/cache';
import { tenantService } from '@/server/services/tenant.service';
import { fail, ok, type ActionResult } from './result';
import type { Tenant } from '@a-la-mano/db';

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
      /* Vaciar el campo debe poder borrar la ubicación, así que el string
       * vacío viaja como null en vez de como undefined. */
      city: formData.has('city') ? (formData.get('city') as string) || null : undefined,
      sector: formData.has('sector') ? (formData.get('sector') as string) || null : undefined,
    });
    revalidatePath(`/${tenant.slug}/settings`);
    revalidatePath(`/${tenant.slug}/admin/recomendados`);
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
