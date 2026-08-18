'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, MapPin, Plus, Star, Users } from 'lucide-react';
import { ProviderAvatar } from '@/components/provider/provider-avatar';
import { adoptarRecomendadoAction } from '@/server/actions/community-provider.actions';
import type { Category, Provider, ProviderPhoto } from '@a-la-mano/db';

/**
 * Un proveedor recomendado desde una comunidad cercana, con la evidencia a la
 * vista: cuánto lo calificaron, cuántas opiniones y en cuántas unidades está.
 *
 * Agregar es un solo toque. La fricción tiene que estar en la decisión, no en
 * el trámite: si sumarlo costara llenar un formulario con los datos que ya
 * tenemos, ningún directorio se llenaría nunca.
 */
export function RecomendadoCard({
  tenantId,
  provider,
  category,
  primaryPhoto,
  mismoSector,
}: {
  tenantId: string;
  provider: Provider;
  category: Category;
  primaryPhoto: ProviderPhoto | null;
  mismoSector: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [agregado, setAgregado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promedio = provider.globalRatingAverage ? Number(provider.globalRatingAverage) : null;

  function agregar() {
    setError(null);
    startTransition(async () => {
      const result = await adoptarRecomendadoAction(tenantId, provider.id);
      if (!result.ok) setError(result.error);
      else {
        setAgregado(true);
        router.refresh();
      }
    });
  }

  return (
    <article className="flex overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
      <ProviderAvatar
        photo={primaryPhoto}
        category={category}
        nombre={provider.name}
        className="w-20 shrink-0 self-stretch sm:w-24"
        tamañoIcono={28}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {category.name}
            </span>
            <h3 className="truncate font-display text-lg font-semibold leading-tight">
              {provider.name}
            </h3>
          </div>
          {promedio && (
            <div className="flex shrink-0 items-center gap-1">
              <Star
                className="h-4 w-4 fill-[var(--color-estrella)] text-[var(--color-estrella)]"
                aria-hidden
              />
              <span className="tabular font-display text-base font-semibold leading-none">
                {promedio.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
          <li className="tabular flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {provider.globalRatingCount}{' '}
            {provider.globalRatingCount === 1 ? 'opinión' : 'opiniones'} en{' '}
            {provider.communityCount}{' '}
            {provider.communityCount === 1 ? 'comunidad' : 'comunidades'}
          </li>
          <li className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {provider.neighborhood ?? provider.city}
            {mismoSector && (
              <span className="ml-1 font-semibold text-[var(--color-text-primary)]">
                · tu sector
              </span>
            )}
          </li>
        </ul>

        {provider.description && (
          <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)]">
            {provider.description}
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-[var(--color-error)]">
            {error}
          </p>
        )}

        <div className="mt-auto pt-1">
          {agregado ? (
            <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-success)]">
              <Check className="h-4 w-4" />
              Agregado a tu directorio
            </span>
          ) : (
            <button
              type="button"
              data-tactil
              onClick={agregar}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
            >
              <Plus className="h-4 w-4" />
              {isPending ? 'Agregando…' : 'Agregar al directorio'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
