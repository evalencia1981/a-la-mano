import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Grid2x2, Plus, Search, Sparkles, Star } from 'lucide-react';
import { ProviderCard } from '@/components/provider/provider-card';
import { OnboardingChecklist } from '@/components/wizard/onboarding-checklist';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { getCurrentUser } from '@/lib/auth/current-user';
import { esUrgencia } from '@/lib/category-groups';
import { categoryService } from '@/server/services/category.service';
import { communityProviderService } from '@/server/services/community-provider.service';
import { suggestionService } from '@/server/services/suggestion.service';
import { memberService } from '@/server/services/member.service';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CommunityDashboardPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const tenantId = current.tenant.id;
  const [destacados, categorias, total, user] = await Promise.all([
    communityProviderService.listInTenant(tenantId, { limit: 4 }),
    categoryService.listActive(),
    communityProviderService.countInTenant(tenantId),
    getCurrentUser(),
  ]);
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));
  const contacto = {
    residente: user?.profile?.fullName,
    comunidad: current.tenant.name,
    sector: current.tenant.sector,
  };

  const isAdmin = current.role === 'owner' || current.role === 'admin';
  const pendientes = isAdmin ? (await suggestionService.listPending(tenantId)).length : 0;
  const miembros = isAdmin ? await memberService.list(tenantId) : [];

  const urgencias = destacados.filter((f) =>
    esUrgencia(categoriaPorId.get(f.provider.categoryId)?.slug),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="text-sm text-[var(--color-text-secondary)]">Directorio de</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {current.tenant.name}
        </h1>
      </header>

      {/* Buscar es lo que la gente viene a hacer: va primero y ocupa el ancho. */}
      <Link
        href={`/${tenantSlug}/directory`}
        data-tactil
        className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3.5 text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
      >
        <Search className="h-5 w-5 shrink-0" aria-hidden />
        <span className="flex-1 text-base">Buscar un servicio…</span>
        <span className="tabular hidden text-sm sm:inline">
          {total} {total === 1 ? 'proveedor' : 'proveedores'}
        </span>
      </Link>

      {isAdmin && (
        <OnboardingChecklist
          tenant={current.tenant}
          state={{
            brandingDone: Boolean(current.tenant.logoUrl),
            hasFirstProvider: total > 0,
            hasInvited: miembros.length > 1,
          }}
        />
      )}

      {isAdmin && pendientes > 0 && (
        <Link
          href={`/${tenantSlug}/admin/suggestions`}
          data-tactil
          className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-bg-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
        >
          <Sparkles className="h-5 w-5 shrink-0 text-[var(--color-accent-primary)]" aria-hidden />
          <span className="flex-1 text-sm">
            <strong className="font-semibold">
              {pendientes} {pendientes === 1 ? 'sugerencia' : 'sugerencias'}
            </strong>{' '}
            {pendientes === 1 ? 'espera' : 'esperan'} tu revisión
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
        </Link>
      )}

      {urgencias.length > 0 && (
        <section
          aria-labelledby="urgencias-dash"
          className="rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--color-urgencia-suave)' }}
        >
          <h2
            id="urgencias-dash"
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--color-urgencia)' }}
          >
            Atienden 24 horas
          </h2>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {urgencias.map((f) => (
              <li key={f.communityProvider.id}>
                <Link
                  href={`/${tenantSlug}/directory/provider/${f.communityProvider.id}`}
                  className="text-sm font-medium underline-offset-4 hover:underline focus-visible:underline"
                >
                  {f.provider.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Star
              className="h-4 w-4 fill-[var(--color-estrella)] text-[var(--color-estrella)]"
              aria-hidden
            />
            Los mejor calificados
          </h2>
          {destacados.length > 0 && (
            <Link
              href={`/${tenantSlug}/directory`}
              className="shrink-0 text-sm font-medium text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-text-primary)] hover:underline"
            >
              Ver todos
            </Link>
          )}
        </div>

        {destacados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
            <h3 className="font-display text-lg font-semibold">Empecemos por el primero</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
              Pensá en ese plomero o esa señora del aseo que todos en la unidad se pasan por
              WhatsApp. Ese es el primero que va acá.
            </p>
            <Link
              href={isAdmin ? `/${tenantSlug}/admin/providers/new` : `/${tenantSlug}/suggest`}
              data-tactil
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
            >
              <Plus className="h-4 w-4" />
              {isAdmin ? 'Agregar el primero' : 'Sugerir un proveedor'}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {destacados.map((fila) => (
              <ProviderCard
                key={fila.communityProvider.id}
                tenantSlug={tenantSlug}
                communityProvider={fila.communityProvider}
                provider={fila.provider}
                primaryPhoto={fila.primaryPhoto}
                category={categoriaPorId.get(fila.provider.categoryId) ?? null}
                contacto={contacto}
              />
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <AccionSecundaria href={`/${tenantSlug}/directory/categories`} icono={<Grid2x2 className="h-4 w-4" />}>
          Ver por categoría
        </AccionSecundaria>
        <AccionSecundaria href={`/${tenantSlug}/suggest`} icono={<Plus className="h-4 w-4" />}>
          Sugerir proveedor
        </AccionSecundaria>
      </div>
    </div>
  );
}

function AccionSecundaria({
  href,
  icono,
  children,
}: {
  href: string;
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-tactil
      className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
    >
      {icono}
      {children}
    </Link>
  );
}
