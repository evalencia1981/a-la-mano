import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { locationService } from '@/server/services/location.service';
import { MapaEditor } from './mapa-editor';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

/**
 * El mapa de la unidad: torres, pisos y zonas comunes.
 *
 * Lo carga el administrador una sola vez, y es la pieza de la que dependen
 * todas las demás: sin nombres reales de lugar, los reportes quedan con
 * texto libre y la agrupación por patrón —que es lo que le permite
 * sustentarle algo al consejo— no agrupa nada.
 */
export default async function LugaresPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const [mapa, pendientes] = await Promise.all([
    locationService.mapaCompleto(current.tenant.id),
    locationService.listSinMapear(current.tenant.id),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-[var(--color-text-secondary)]">Administración</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">Mapa de la unidad</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Las torres, pisos y zonas comunes con sus nombres reales. Cargarlo es lo que hace
          que ocho reportes en el mismo lugar se vean como ocho reportes en el mismo lugar,
          y no como ocho textos distintos.
        </p>
      </header>

      <MapaEditor
        tenantId={current.tenant.id}
        torres={mapa.torres}
        zonas={mapa.zonas}
        pendientes={pendientes.map((p) => ({
          texto: p.texto,
          cantidad: p.cantidad,
          variantes: p.variantes,
        }))}
      />
    </div>
  );
}
