import Link from 'next/link';
import { Phone, Star } from 'lucide-react';
import { ProviderAvatar } from './provider-avatar';
import { esUrgencia } from '@/lib/category-groups';
import { armarMensajeContacto, getTelUrl, getWhatsappUrl } from '@/lib/contact';
import type { Category, CommunityProvider, Provider, ProviderPhoto } from '@a-la-mano/db';

/** Quién escribe y desde qué comunidad, para presentar el chat. */
export interface DatosDeContacto {
  residente?: string | null;
  comunidad: string;
  sector?: string | null;
}

/**
 * Ficha de un proveedor dentro del directorio de una comunidad.
 *
 * Decisiones que vale la pena no deshacer sin pensarlo:
 *
 *  - La imagen ocupa un lateral completo y de altura fija. Cuando el
 *    proveedor subió foto se ve su trabajo, que en oficios como peluquería
 *    o manicura es lo que decide; cuando no, entra el ícono del oficio, así
 *    la ficha nunca queda con un hueco.
 *  - La acción de contacto vive acá, no dentro del detalle. Quien busca un
 *    plomero a las 11 de la noche no quiere leer una ficha, quiere escribir.
 *  - La franja lateral es el color del grupo de la categoría, así el ojo
 *    agrupa servicios parecidos al recorrer la lista.
 *
 * El link que cubre la ficha se hace con `after:absolute inset-0` en vez de
 * envolver todo en un <a>: anidar anchors es inválido y rompería los botones
 * de contacto, que van por encima con `relative z-10`.
 */
export function ProviderCard({
  tenantSlug,
  communityProvider,
  provider,
  primaryPhoto,
  category,
  contacto,
  href,
}: {
  tenantSlug: string;
  communityProvider: CommunityProvider;
  provider: Provider;
  primaryPhoto: ProviderPhoto | null;
  category?: Category | null;
  /**
   * A dónde lleva la ficha. Por defecto al detalle del directorio, que es
   * lo que necesita el vecino; la administración le pasa su propia ruta de
   * edición. Sin esto, la lista de admin mandaba a la vista pública y la
   * pantalla de edición quedaba inalcanzable navegando.
   */
  href?: string;
  /**
   * Con quién y desde dónde escribe el vecino. Va como datos y no como
   * función armada: esta ficha se renderiza dentro del buscador, que es
   * componente de cliente, y las funciones no cruzan esa frontera.
   */
  contacto?: DatosDeContacto;
}) {
  const promedio = communityProvider.ratingAverage ? Number(communityProvider.ratingAverage) : null;
  const urgencia = esUrgencia(category?.slug);
  const whatsapp = getWhatsappUrl(
    provider,
    contacto ? armarMensajeContacto({ ...contacto, proveedor: provider.name }) : null,
  );

  return (
    <article className="group relative flex overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] transition-all focus-within:border-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)] hover:shadow-[0_2px_12px_rgba(15,31,26,0.06)]">
      <ProviderAvatar
        photo={primaryPhoto}
        category={category}
        nombre={provider.name}
        className="w-24 shrink-0 self-stretch sm:w-28"
        tamañoIcono={32}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                {category?.name ?? 'Servicio'}
              </span>
              {urgencia && (
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    color: 'var(--color-urgencia)',
                    backgroundColor: 'var(--color-urgencia-suave)',
                  }}
                >
                  24h
                </span>
              )}
            </div>

            <h3 className="truncate font-display text-lg font-semibold leading-tight">
              <Link
                href={href ?? `/${tenantSlug}/directory/provider/${communityProvider.id}`}
                className="outline-none after:absolute after:inset-0 focus-visible:underline focus-visible:decoration-2 focus-visible:underline-offset-2"
              >
                {provider.name}
              </Link>
            </h3>

            <p className="truncate text-sm text-[var(--color-text-secondary)]">
              {provider.neighborhood ? `${provider.neighborhood} · ` : ''}
              {provider.city}
            </p>
          </div>

          <div className="shrink-0 text-right">
            {promedio ? (
              <>
                <div className="flex items-center justify-end gap-1">
                  <Star
                    className="h-3.5 w-3.5 fill-[var(--color-estrella)] text-[var(--color-estrella)]"
                    aria-hidden
                  />
                  <span className="tabular font-display text-base font-semibold leading-none">
                    {promedio.toFixed(1)}
                  </span>
                </div>
                <span className="tabular text-[11px] text-[var(--color-text-secondary)]">
                  {communityProvider.ratingCount}{' '}
                  {communityProvider.ratingCount === 1 ? 'opinión' : 'opiniones'}
                </span>
              </>
            ) : (
              <span className="text-[11px] text-[var(--color-text-secondary)]">Sin calificar</span>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-auto flex gap-2">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              data-tactil
              /* Verde de WhatsApp, no el acento de la comunidad: la gente
               * reconoce ese botón antes de leerlo. */
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
            >
              <WhatsappIcon className="h-4 w-4" />
              WhatsApp
            </a>
          )}
          <a
            href={getTelUrl(provider.phone)}
            data-tactil
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
          >
            <Phone className="h-4 w-4" />
            Llamar
          </a>
        </div>
      </div>
    </article>
  );
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.886-9.885 9.886m8.413-18.297A11.8 11.8 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.8 11.8 0 0 0-3.48-8.413" />
    </svg>
  );
}
