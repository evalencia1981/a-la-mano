'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  removeProviderFromCommunityAction,
  restoreProviderAction,
} from '@/server/actions/community-provider.actions';
import type { CommunityProvider } from '@a-la-mano/db';

export function ProviderActions({
  tenantId,
  communityProvider,
}: {
  tenantId: string;
  communityProvider: CommunityProvider;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function deactivate() {
    if (!confirm('¿Desactivar este proveedor de tu comunidad? Los ratings se preservan.')) return;
    startTransition(async () => {
      const result = await removeProviderFromCommunityAction(tenantId, communityProvider.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function restore() {
    startTransition(async () => {
      const result = await restoreProviderAction(tenantId, communityProvider.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {communityProvider.isActive ? (
        <Button type="button" variant="destructive" onClick={deactivate} disabled={isPending}>
          Desactivar de la comunidad
        </Button>
      ) : (
        <Button type="button" onClick={restore} disabled={isPending}>
          Reactivar en la comunidad
        </Button>
      )}
      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
    </div>
  );
}
