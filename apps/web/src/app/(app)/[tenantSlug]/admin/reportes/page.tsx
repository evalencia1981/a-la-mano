import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, TriangleAlert } from 'lucide-react';
import { ReporteItem } from './reporte-item';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { etiquetaIncidente, tipoIncidente } from '@/lib/incident-types';
import { incidentService } from '@/server/services/incident.service';

export const metadata = { title: 'Admin · Reportes' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

/** A partir de acá deja de ser un reclamo suelto y pasa a ser un patrón. */
const UMBRAL_PATRON = 3;

export default async function ReportesPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const [reportes, patrones] = await Promise.all([
    incidentService.listParaAdmin(current.tenant.id),
    incidentService.listPatrones(current.tenant.id),
  ]);

  const repetidos = patrones.filter((p) => p.cantidad >= UMBRAL_PATRON);
  const sinResolver = reportes.filter((r) => r.reporte.status !== 'resuelto');
  const resueltos = reportes.filter((r) => r.reporte.status === 'resuelto');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/${tenantSlug}/admin`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Administración
      </Link>

      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {reportes.length === 0
            ? 'Todavía sin reportes.'
            : `${sinResolver.length} sin resolver de ${reportes.length} en total.`}
        </p>
      </header>

      {/* Lo que se repite es lo que se puede sustentar: en una asamblea, ante
          el consejo, o el día que haya que demostrar que estaba advertido. */}
      {repetidos.length > 0 && (
        <section className="space-y-2 rounded-[var(--radio-panel)] border border-[var(--color-border)] p-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <TriangleAlert
              className="h-4 w-4"
              style={{ color: 'var(--color-urgencia)' }}
              aria-hidden
            />
            Se está repitiendo
          </h2>
          <ul className="space-y-1.5">
            {repetidos.map((p) => {
              const esRiesgo = tipoIncidente(p.type)?.gravedad === 'riesgo';
              return (
                <li key={`${p.type}-${p.location}`} className="flex items-baseline gap-2 text-sm">
                  <span
                    className="tabular shrink-0 rounded px-1.5 py-0.5 text-xs font-bold"
                    style={{
                      color: esRiesgo ? 'var(--color-urgencia)' : 'var(--color-text-secondary)',
                      backgroundColor: esRiesgo
                        ? 'var(--color-urgencia-suave)'
                        : 'var(--color-bg-secondary)',
                    }}
                  >
                    {p.cantidad}
                  </span>
                  <span>
                    <strong className="font-medium">{etiquetaIncidente(p.type)}</strong>
                    {p.location ? ` en ${p.location}` : ''}
                    {p.sinResolver > 0 && (
                      <span className="text-[var(--color-text-secondary)]">
                        {' '}
                        · {p.sinResolver} sin resolver
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="pt-1 text-xs text-[var(--color-text-secondary)]">
            Esto es lo que sustenta un comunicado, una inversión ante el consejo, o la
            constancia de que el tema estaba advertido.
          </p>
        </section>
      )}

      {reportes.length === 0 ? (
        <div className="rounded-[var(--radio-panel)] border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
          <h2 className="font-display text-lg font-semibold">Nadie reportó nada todavía</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
            Contale a los vecinos que pueden reportar desde la app lo que hoy escriben en el
            grupo: niños en el parqueadero, objetos que caen de los balcones, ruido.
          </p>
        </div>
      ) : (
        <>
          {sinResolver.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Pendientes</h2>
              {sinResolver.map(({ reporte, reportante }) => (
                <ReporteItem
                  key={reporte.id}
                  tenantId={current.tenant.id}
                  reporte={reporte}
                  reportante={reportante}
                />
              ))}
            </section>
          )}

          {resueltos.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-[var(--color-text-secondary)]">
                Resueltos
              </h2>
              {resueltos.map(({ reporte, reportante }) => (
                <ReporteItem
                  key={reporte.id}
                  tenantId={current.tenant.id}
                  reporte={reporte}
                  reportante={reportante}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
