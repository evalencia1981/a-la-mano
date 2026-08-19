import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, MapPin, Sparkles } from 'lucide-react';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { communityProviderService } from '@/server/services/community-provider.service';
import { incidentService } from '@/server/services/incident.service';
import { taskService } from '@/server/services/task.service';
import { locationService } from '@/server/services/location.service';
import { suggestionService } from '@/server/services/suggestion.service';
import { memberService } from '@/server/services/member.service';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AdminDashboardPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const [
    proveedores,
    sugerencias,
    miembros,
    recomendados,
    reportesPendientes,
    lugaresSinMapear,
    pendientesAbiertos,
  ] = await Promise.all([
    communityProviderService.listInTenantAdmin(current.tenant.id),
    suggestionService.listPending(current.tenant.id),
    memberService.list(current.tenant.id),
    communityProviderService.listRecomendados(current.tenant.id),
    incidentService.countSinResolver(current.tenant.id),
    locationService.listSinMapear(current.tenant.id),
    taskService.countAbiertas(current.tenant.id),
  ]);

  const metricas = [
    {
      label: 'Pendientes abiertos',
      valor: pendientesAbiertos,
      href: `/${tenantSlug}/admin/pendientes`,
    },
    {
      label: 'Proveedores activos',
      valor: proveedores.filter((p) => p.communityProvider.isActive).length,
      href: `/${tenantSlug}/admin/providers`,
    },
    {
      label: 'Reportes sin resolver',
      valor: reportesPendientes,
      href: `/${tenantSlug}/admin/reportes`,
    },
    {
      label: 'Sugerencias pendientes',
      valor: sugerencias.length,
      href: `/${tenantSlug}/admin/suggestions`,
    },
    { label: 'Miembros', valor: miembros.length, href: `/${tenantSlug}/settings/members` },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-sm text-[var(--color-text-secondary)]">Administración</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">{current.tenant.name}</h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricas.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 transition-colors hover:border-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
          >
            <div className="text-sm text-[var(--color-text-secondary)]">{m.label}</div>
            <div className="tabular mt-1 font-display text-3xl font-bold">{m.valor}</div>
          </Link>
        ))}
      </div>

      {/* Los vecinos ya están reportando en lugares que no existen en el
          mapa. Mientras no se carguen, esos reportes no agrupan con nada. */}
      {lugaresSinMapear.length > 0 && (
        <Link
          href={`/${tenantSlug}/admin/lugares`}
          data-tactil
          className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3.5 transition-colors hover:border-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
        >
          <MapPin className="h-5 w-5 shrink-0 text-[var(--color-urgencia)]" aria-hidden />
          <span className="flex-1 text-sm">
            <strong className="font-semibold">
              {lugaresSinMapear.length}{' '}
              {lugaresSinMapear.length === 1 ? 'lugar mencionado' : 'lugares mencionados'}
            </strong>{' '}
            en reportes y todavía sin cargar en el mapa
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]"
            aria-hidden
          />
        </Link>
      )}

      {/* Solo aparece si hay algo concreto que ofrecer. Un enlace a una lista
          vacía es una promesa incumplida. */}
      {recomendados.length > 0 && (
        <Link
          href={`/${tenantSlug}/admin/recomendados`}
          data-tactil
          className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3.5 transition-colors hover:border-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
        >
          <Sparkles className="h-5 w-5 shrink-0 text-[var(--color-accent-primary)]" aria-hidden />
          <span className="flex-1 text-sm">
            <strong className="font-semibold">
              {recomendados.length}{' '}
              {recomendados.length === 1 ? 'proveedor recomendado' : 'proveedores recomendados'}
            </strong>{' '}
            por comunidades cercanas
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]"
            aria-hidden
          />
        </Link>
      )}
    </div>
  );
}
