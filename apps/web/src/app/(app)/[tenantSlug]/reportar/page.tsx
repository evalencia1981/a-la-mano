import { notFound } from 'next/navigation';
import { MisReportes } from './mis-reportes';
import { ReporteForm } from './reporte-form';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
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

  const torres = mapa.torres.map((t) => ({
    lugar: { id: t.lugar.id, name: t.lugar.name },
    hijos: t.hijos.map((h) => ({ id: h.id, name: h.name })),
  }));
  const zonas = mapa.zonas.map((z) => ({ id: z.id, name: z.name }));

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
        torres={torres}
        zonas={zonas}
      />

      {mios.length > 0 && (
        <MisReportes
          tenantId={current.tenant.id}
          reportes={mios}
          torres={torres}
          zonas={zonas}
          esAdmin={esAdmin}
        />
      )}
    </div>
  );
}
