'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateBrandingAction } from '@/server/actions/tenant.actions';
import type { Tenant } from '@evalencia-stack/db';

/**
 * Form de branding por tenant. El upload real del logo (al storage de
 * Supabase) queda para el proyecto que lo necesite — acá aceptamos solo
 * una URL pre-existente para no atar el template a un proveedor de storage.
 */
export function BrandingForm({ tenant, disabled }: { tenant: Tenant; disabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [primary, setPrimary] = useState(tenant.primaryColor ?? '#3B82F6');
  const [secondary, setSecondary] = useState(tenant.secondaryColor ?? '#1E40AF');
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'error'; message?: string }>({
    kind: 'idle',
  });

  function onSubmit(formData: FormData) {
    setStatus({ kind: 'idle' });
    startTransition(async () => {
      const result = await updateBrandingAction(tenant.id, formData);
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
        <Label htmlFor="logoUrl">URL del logo</Label>
        <Input
          id="logoUrl"
          name="logoUrl"
          type="url"
          defaultValue={tenant.logoUrl ?? ''}
          placeholder="https://..."
          disabled={disabled}
        />
        <p className="text-xs text-[var(--color-text-secondary)]">
          Subí la imagen a Supabase Storage (o tu CDN) y pegá la URL acá.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ColorField
          name="primaryColor"
          label="Color primario"
          value={primary}
          onChange={setPrimary}
          disabled={disabled}
        />
        <ColorField
          name="secondaryColor"
          label="Color secundario"
          value={secondary}
          onChange={setSecondary}
          disabled={disabled}
        />
      </div>

      {status.kind === 'ok' && <p className="text-sm text-[var(--color-success)]">Guardado.</p>}
      {status.kind === 'error' && (
        <p className="text-sm text-[var(--color-error)]">{status.message}</p>
      )}
      <Button type="submit" disabled={disabled || isPending}>
        {isPending ? 'Guardando...' : 'Guardar'}
      </Button>
    </form>
  );
}

function ColorField({
  name,
  label,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          className="h-10 w-12 cursor-pointer rounded border border-[var(--color-border)] disabled:cursor-not-allowed"
        />
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          pattern="#[0-9A-Fa-f]{6}"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
