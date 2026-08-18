import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MapPin } from 'lucide-react';
import { RecomendadoCard } from './recomendado-card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { etiquetaUbicacion } from '@/lib/geo';
import { communityProviderService } from '@/server/services/community-provider.service';

export const metadata = { title: 'Admin · Recomendados' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function RecomendadosPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const { tenant } = current;
  const ubicacion = etiquetaUbicacion(tenant.city, tenant.sector);
  const recomendados = ubicacion ? await communityProviderService.listRecomendados(tenant.id) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/${tenantSlug}/admin`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Administración
      </Link>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Recomendados cerca tuyo</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Proveedores que otras comunidades de tu zona ya probaron y calificaron bien. Ninguno
          entra a tu directorio hasta que vos lo agregues.
        </p>
        {ubicacion && (
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
            <MapPin className="h-4 w-4" aria-hidden />
            Buscando cerca de <strong className="font-semibold">{ubicacion}</strong>
            <Link
              href={`/${tenantSlug}/settings`}
              className="underline underline-offset-4 hover:text-[var(--color-text-primary)]"
            >
              cambiar
            </Link>
          </p>
        )}
      </header>

      {!ubicacion ? (
        /* Sin ciudad no hay forma de saber qué le queda cerca a esta comunidad. */
        <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
          <h2 className="font-display text-lg font-semibold">Falta decir dónde queda tu comunidad</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
            Cargá la ciudad y el sector en la configuración y acá van a aparecer los proveedores
            mejor calificados de unidades vecinas.
          </p>
          <Link
            href={`/${tenantSlug}/settings`}
            data-tactil
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
          >
            <MapPin className="h-4 w-4" />
            Configurar ubicación
          </Link>
        </div>
      ) : recomendados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
          <h2 className="font-display text-lg font-semibold">Todavía no hay nada para recomendarte</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
            Para aparecer acá, un proveedor tiene que estar en otra comunidad de {tenant.city} y
            tener al menos 3 opiniones con un promedio de 4.0 o más. A medida que las unidades
            vecinas califiquen, esta lista se llena sola.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recomendados.map((r) => (
            <RecomendadoCard
              key={r.provider.id}
              tenantId={tenant.id}
              provider={r.provider}
              category={r.category}
              primaryPhoto={r.primaryPhoto}
              mismoSector={r.mismoSector}
            />
          ))}
        </div>
      )}
    </div>
  );
}
