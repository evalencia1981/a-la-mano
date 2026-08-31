import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { billingService } from '@/server/services/billing.service';
import { CheckoutButton } from './checkout-button';

export const metadata = { title: 'Facturación' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ activated?: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  trial: 'En trial',
  active: 'Activo',
  past_due: 'Pago pendiente',
  suspended: 'Suspendido',
};

export default async function BillingPage({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const { activated } = await searchParams;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const status = current.tenant.status ?? 'trial';
  const trialDays = billingService.trialDaysRemaining(current.tenant.trialEndsAt, status);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Facturación</h1>
      </header>

      {activated === 'mock' && (
        <div className="rounded-[var(--radio-control)] border border-[var(--color-success)] bg-[var(--color-success)]/10 px-3 py-2 text-sm">
          Suscripción simulada activada. (TODO: reemplazar por Stripe real.)
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Plan actual</CardTitle>
          <CardDescription>Estado: {STATUS_LABEL[status] ?? status}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {trialDays !== null && (
            <p>
              {trialDays >= 0
                ? `Te quedan ${trialDays} ${trialDays === 1 ? 'día' : 'días'} de trial.`
                : `Tu trial venció hace ${Math.abs(trialDays)} días.`}
            </p>
          )}
          {status === 'active' && current.tenant.stripeSubscriptionId && (
            <p className="text-[var(--color-text-secondary)]">
              Suscripción: {current.tenant.stripeSubscriptionId}
            </p>
          )}
          {(status === 'trial' || status === 'past_due') && (
            <CheckoutButton tenantId={current.tenant.id} />
          )}
          <p className="text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)] pt-3">
            Stripe todavía no está conectado — el botón usa un checkout simulado que activa
            la suscripción localmente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
