'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateTenantAction } from '@/server/actions/tenant.actions';
import type { Tenant } from '@evalencia-stack/db';

export function GeneralSettingsForm({ tenant, disabled }: { tenant: Tenant; disabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'error'; message?: string }>({
    kind: 'idle',
  });

  function onSubmit(formData: FormData) {
    setStatus({ kind: 'idle' });
    startTransition(async () => {
      const result = await updateTenantAction(tenant.id, formData);
      if (result.ok) {
        setStatus({ kind: 'ok' });
        router.refresh();
      } else {
        setStatus({ kind: 'error', message: result.error });
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" defaultValue={tenant.name} required disabled={disabled} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="defaultLanguage">Idioma</Label>
          <Input
            id="defaultLanguage"
            name="defaultLanguage"
            defaultValue={tenant.defaultLanguage ?? 'es'}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue={tenant.timezone ?? 'America/Bogota'}
            disabled={disabled}
          />
        </div>
      </div>
      {status.kind === 'ok' && (
        <p className="text-sm text-[var(--color-success)]">Guardado.</p>
      )}
      {status.kind === 'error' && (
        <p className="text-sm text-[var(--color-error)]">{status.message}</p>
      )}
      <Button type="submit" disabled={disabled || isPending}>
        {isPending ? 'Guardando...' : 'Guardar'}
      </Button>
    </form>
  );
}
