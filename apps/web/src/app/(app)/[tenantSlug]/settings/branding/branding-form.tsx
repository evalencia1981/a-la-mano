'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { contraste, tintaSobre } from '@/lib/contraste';
import { updateBrandingAction } from '@/server/actions/tenant.actions';
import type { Tenant } from '@a-la-mano/db';

/**
 * Form de branding por tenant. El upload real del logo (al storage de
 * Supabase) queda para el proyecto que lo necesite — acá aceptamos solo
 * una URL pre-existente para no atar el template a un proveedor de storage.
 */
export function BrandingForm({ tenant, disabled }: { tenant: Tenant; disabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [primary, setPrimary] = useState(tenant.primaryColor ?? '#0C6478');
  const [secondary, setSecondary] = useState(tenant.secondaryColor ?? '#15919B');
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <VistaPrevia color={primary} />

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

/**
 * Cómo se va a ver el color elegido en un botón.
 *
 * El color primario termina de fondo en todos los botones de acción de la
 * comunidad, y hasta acá se elegía a ciegas: se veía el cuadradito y nada
 * más. Una unidad quedó con el botón "Guardar" en morado oscuro y la letra
 * ilegible sin que nadie pudiera darse cuenta antes de guardar.
 *
 * La letra ya no se elige a mano —`tintaSobre` toma la que mejor contrasta
 * de las dos—, pero hay colores donde ninguna de las dos alcanza: un tono
 * medio deja el texto en 3.6:1 se ponga blanco o navy. Eso no lo arregla la
 * tinta, lo arregla elegir otro color, y para eso hay que verlo.
 */
function VistaPrevia({ color }: { color: string }) {
  const tinta = tintaSobre(color);
  const razon = contraste(color, tinta);
  /* 4.5:1 es el mínimo de WCAG AA para texto de tamaño normal. */
  const flojo = razon < 4.5;

  return (
    <div className="space-y-2">
      <Label>Cómo se ven los botones</Label>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex h-11 items-center rounded-[var(--radio-control)] px-4 text-sm font-medium"
          style={{ backgroundColor: color, color: tinta }}
        >
          Guardar cambios
        </span>
        <span className="tabular text-xs text-[var(--color-text-secondary)]">
          contraste {razon.toFixed(1)}:1
        </span>
      </div>
      {flojo && (
        <p className="text-xs text-[var(--color-warning)]">
          Con este color la letra queda en {razon.toFixed(1)}:1, por debajo del mínimo legible
          de 4.5:1. Probá un tono más oscuro o más claro — los intermedios son los que no
          funcionan con ninguna letra.
        </p>
      )}
    </div>
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
