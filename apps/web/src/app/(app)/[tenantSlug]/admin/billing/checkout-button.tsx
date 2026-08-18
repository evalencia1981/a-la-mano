'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { startCheckoutAction } from '@/server/actions/billing.actions';

export function CheckoutButton({ tenantId }: { tenantId: string }) {
  const [isPending, startTransition] = useTransition();

  function go() {
    startTransition(async () => {
      const result = await startCheckoutAction(tenantId);
      if (result.ok) {
        window.location.href = result.data.url;
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <Button onClick={go} disabled={isPending}>
      {isPending ? 'Redirigiendo...' : 'Activar suscripción'}
    </Button>
  );
}
