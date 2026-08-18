import { NextResponse, type NextRequest } from 'next/server';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { billingService } from '@/server/services/billing.service';

/**
 * Mock del checkout de Stripe. En lugar de mandar al user a checkout.stripe.com
 * lo trae acá, marcamos el tenant como `active` con suscripción simulada, y
 * lo devolvemos al admin/billing del tenant.
 *
 * TODO: borrar este archivo cuando se conecte Stripe real.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tenantId = searchParams.get('tenant');
  if (!tenantId) {
    return NextResponse.redirect(`${origin}/select-tenant`);
  }

  const tenant = await tenantRepository.findById(tenantId);
  if (!tenant) {
    return NextResponse.redirect(`${origin}/select-tenant`);
  }

  // Simulamos la suscripción Stripe.
  await billingService.handleSubscriptionCreated(`sub_mock_${Date.now()}`, tenantId);

  return NextResponse.redirect(`${origin}/${tenant.slug}/admin/billing?activated=mock`);
}
