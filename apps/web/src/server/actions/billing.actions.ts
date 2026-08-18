'use server';

import { billingService } from '@/server/services/billing.service';
import { assertRole } from '@/lib/auth/guards';
import { fail, ok, type ActionResult } from './result';

export async function startCheckoutAction(
  tenantId: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    await assertRole(tenantId, ['owner', 'admin']);
    const { url } = await billingService.createCheckoutSession(tenantId);
    return ok({ url });
  } catch (error) {
    return fail(error);
  }
}
