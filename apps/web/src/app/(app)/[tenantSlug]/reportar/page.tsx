import { notFound } from 'next/navigation';
import { ReporteForm } from './reporte-form';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { ESTADOS_INCIDENTE, etiquetaIncidente, type EstadoIncidente } from '@/lib/incident-types';
import { incidentService } from '@/server/services/incident.service';
import { locationService } from '@/server/services/location.service';

export const metadata = { title: 'Reportar' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ReportarPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const [mios, mapa] = await Promise.all([
    incidentService.listMios(current.tenant.id),
    locationService.mapa(current.tenant.id),
  ]);

  const esAdmin = current.role === 'owner' || current.role === 'admin';

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Reportar</h1>
        <p className="text-[15px] text-[var(--color-text-secondary)]">
          Lo que hoy se escribe en el grupo y se pierde. Acá queda registrado, y cuando varios
          vecinos reportan lo mismo la administración tiene con qué actuar.
        </p>
      </header>

      <ReporteForm
        tenantId={current.tenant.id}
        esAdmin={esAdmin}
        torres={mapa.torres.map((t) => ({
          lugar: { id: t.lugar.id, name: t.lugar.name },
          hijos: t.hijos.map((h) => ({ id: h.id, name: h.name })),
        }))}
        zonas={mapa.zonas.map((z) => ({ id: z.id, name: z.name }))}
      />

      {mios.length > 0 && (
        <section className="space-y-3 border-t border-[var(--color-border)] pt-6">
          <h2 className="font-display text-lg font-semibold">Lo que reportaste</h2>
          <ul className="space-y-2">
            {mios.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-[var(--radio-panel)] border border-[var(--color-border)] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{etiquetaIncidente(r.type)}</div>
                  <div className="truncate text-xs text-[var(--color-text-secondary)]">
                    {r.location ? `${r.location} · ` : ''}
                    {r.createdAt.toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                  {r.resolutionNote && (
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      Respuesta: {r.resolutionNote}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={
                    r.status === 'resuelto'
                      ? { color: 'var(--color-success)', backgroundColor: 'var(--color-bg-secondary)' }
                      : { color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)' }
                  }
                >
                  {ESTADOS_INCIDENTE[r.status as EstadoIncidente] ?? r.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
