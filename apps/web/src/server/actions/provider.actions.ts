'use server';

import { revalidatePath } from 'next/cache';
import { providerService, type ProviderInput } from '@/server/services/provider.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { fail, ok, type ActionResult } from './result';
import type { Provider } from '@a-la-mano/db';

export async function searchProvidersAction(input: {
  query?: string;
  categoryId?: string;
  city?: string;
  limit?: number;
}): Promise<ActionResult<Provider[]>> {
  try {
    return ok(await providerService.search(input));
  } catch (error) {
    return fail(error);
  }
}

export async function getProviderAction(id: string): Promise<ActionResult<Provider | null>> {
  try {
    return ok(await providerService.getById(id));
  } catch (error) {
    return fail(error);
  }
}

/**
 * Edita la ficha de un proveedor desde la administración de una comunidad.
 *
 * Ojo: `providers` es global, así que el cambio le llega a todas las
 * comunidades que lo tengan en su directorio. El service exige ser
 * owner/admin de una comunidad que efectivamente lo tenga.
 */
export async function actualizarProveedorAction(
  tenantId: string,
  providerId: string,
  input: Partial<ProviderInput>,
): Promise<ActionResult<{ provider: Provider }>> {
  try {
    const provider = await providerService.updateFromTenant(tenantId, providerId, input);
    const tenant = await tenantRepository.findById(tenantId);
    if (tenant) {
      revalidatePath(`/${tenant.slug}/admin/providers`);
      revalidatePath(`/${tenant.slug}/admin/providers/${providerId}`);
      revalidatePath(`/${tenant.slug}/admin/pendientes`);
      revalidatePath(`/${tenant.slug}/directory`);
    }
    return ok({ provider });
  } catch (error) {
    return fail(error);
  }
}
