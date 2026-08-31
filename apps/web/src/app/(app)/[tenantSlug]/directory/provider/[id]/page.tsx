import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ImagePlus, Star } from 'lucide-react';
import { PhotoGallery } from '@/components/provider/photo-gallery';
import { ProviderAvatar } from '@/components/provider/provider-avatar';
import { ContactButtons } from '@/components/provider/contact-buttons';
import { RatingForm } from '@/components/provider/rating-form';
import { RatingList } from '@/components/provider/rating-list';
import { LocalNotes } from '@/components/provider/local-notes';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { getCurrentUser } from '@/lib/auth/current-user';
import { esUrgencia } from '@/lib/category-groups';
import { communityProviderService } from '@/server/services/community-provider.service';
import { providerPhotoService } from '@/server/services/provider-photo.service';
import { ratingService } from '@/server/services/rating.service';
import { categoryService } from '@/server/services/category.service';

interface Props {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export default async function ProviderDetailPage({ params }: Props) {
  const { tenantSlug, id } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const details = await communityProviderService.getDetails(current.tenant.id, id);
  if (!details) notFound();

  const { communityProvider, provider } = details;
  const [photos, ratings, miCalificacion, category, user] = await Promise.all([
    providerPhotoService.listByProvider(provider.id),
    ratingService.listForCommunityProvider(current.tenant.id, communityProvider.id),
    ratingService.getMyRating(current.tenant.id, communityProvider.id),
    categoryService.listActive().then((cs) => cs.find((c) => c.id === provider.categoryId)),
    getCurrentUser(),
  ]);

  const promedio = communityProvider.ratingAverage ? Number(communityProvider.ratingAverage) : null;
  const esAdmin = current.role === 'owner' || current.role === 'admin';
  const urgencia = esUrgencia(category?.slug);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/${tenantSlug}/directory`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Directorio
      </Link>

      {photos.length > 0 ? (
        <PhotoGallery photos={photos} />
      ) : (
        /* Sin fotos: el ícono del oficio sostiene la cabecera. A quien puede
         * resolverlo le ofrecemos el atajo para subirlas acá mismo. */
        <div className="relative overflow-hidden rounded-[var(--radio-ficha)]">
          <ProviderAvatar
            photo={null}
            category={category}
            nombre={provider.name}
            className="h-40 w-full sm:h-52"
            tamañoIcono={64}
          />
          {esAdmin && (
            <Link
              href={`/${tenantSlug}/admin/providers/${communityProvider.id}`}
              data-tactil
              className="absolute bottom-3 right-3 flex items-center gap-2 rounded-[var(--radio-control)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-[var(--color-bg-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ImagePlus className="h-4 w-4" />
              Agregar fotos
            </Link>
          )}
        </div>
      )}

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
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
              Atiende 24h
            </span>
          )}
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {provider.name}
        </h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {promedio ? (
            <span className="flex items-center gap-1.5">
              <Star
                className="h-4 w-4 fill-[var(--color-estrella)] text-[var(--color-estrella)]"
                aria-hidden
              />
              <span className="tabular font-display text-base font-semibold">
                {promedio.toFixed(1)}
              </span>
              <span className="text-[var(--color-text-secondary)]">
                · {communityProvider.ratingCount}{' '}
                {communityProvider.ratingCount === 1 ? 'opinión' : 'opiniones'}
              </span>
            </span>
          ) : (
            <span className="text-[var(--color-text-secondary)]">
              Todavía sin calificaciones
            </span>
          )}
          <span className="text-[var(--color-text-secondary)]">
            {provider.neighborhood ? `${provider.neighborhood} · ` : ''}
            {provider.city}
          </span>
        </div>
      </header>

      <ContactButtons
        provider={provider}
        contacto={{
          residente: user?.profile?.fullName,
          comunidad: current.tenant.name,
          sector: current.tenant.sector,
        }}
      />

      {provider.description && (
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{provider.description}</p>
      )}

      {esAdmin && photos.length > 0 && (
        <Link
          href={`/${tenantSlug}/admin/providers/${communityProvider.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] underline-offset-4 transition-colors hover:text-[var(--color-text-primary)] hover:underline"
        >
          <ImagePlus className="h-4 w-4" />
          Administrar fotos
        </Link>
      )}

      <LocalNotes
        tenantId={current.tenant.id}
        communityProviderId={communityProvider.id}
        notes={communityProvider.localNotes}
        canEdit={esAdmin}
      />

      <section className="space-y-3 border-t border-[var(--color-border)] pt-6">
        <h2 className="font-display text-xl font-semibold">
          {miCalificacion ? 'Tu calificación' : '¿Lo recomendás?'}
        </h2>
        <RatingForm
          tenantId={current.tenant.id}
          communityProviderId={communityProvider.id}
          initial={miCalificacion}
        />
      </section>

      <section className="space-y-3 border-t border-[var(--color-border)] pt-6">
        <h2 className="font-display text-xl font-semibold">
          {ratings.length === 0
            ? 'Sin opiniones todavía'
            : `${ratings.length} ${ratings.length === 1 ? 'opinión' : 'opiniones'} de vecinos`}
        </h2>
        <RatingList tenantId={current.tenant.id} ratings={ratings} actorRole={current.role} />
      </section>
    </div>
  );
}
