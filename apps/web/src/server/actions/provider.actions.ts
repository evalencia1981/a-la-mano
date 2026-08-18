'use server';

import { providerService } from '@/server/services/provider.service';
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
