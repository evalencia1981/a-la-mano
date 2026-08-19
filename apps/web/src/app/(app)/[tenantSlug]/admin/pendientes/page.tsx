import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { locationService } from '@/server/services/location.service';
import { positionService } from '@/server/services/position.service';
import { taskService } from '@/server/services/task.service';
import { Captura } from './captura';
import { Bandeja } from './bandeja';

interface Props {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ dia?: string }>;
}

/**
 * La bandeja de pendientes del administrador.
 *
 * Arriba la captura, siempre, porque es lo que se usa cien veces por día y
 * lo que decide si el módulo se usa o no. La consulta —"qué metí hoy, qué se
 * atendió, qué no y por qué"— viene después: es importante, pero se hace una
 * vez al día y no caminando.
 */
export default async function PendientesPage({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const { dia } = await searchParams;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const soloHoy = dia === 'hoy';

  const [filas, puestos, mapa] = await Promise.all([
    soloHoy
      ? taskService.listDelDia(current.tenant.id, new Date())
      : taskService.listBandeja(current.tenant.id),
    positionService.listActivos(current.tenant.id),
    locationService.mapa(current.tenant.id),
  ]);

  const puestosVista = puestos.map((p) => ({
    id: p.id,
    name: p.name,
    tieneWhatsapp: Boolean(p.phoneNormalized),
  }));

  /* Solo torres y zonas: los pisos harían una fila de cuarenta chips en una
     pantalla que tiene que resolverse de un vistazo. Se ajustan después
     desde el detalle si hace falta. */
  const lugares = [
    ...mapa.torres.map((t) => ({ id: t.lugar.id, name: t.lugar.name })),
    ...mapa.zonas.map((z) => ({ id: z.id, name: z.name })),
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-[var(--color-text-secondary)]">Administración</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">Pendientes</h1>
      </header>

      <Captura tenantId={current.tenant.id} puestos={puestosVista} lugares={lugares} />

      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/${tenantSlug}/admin/pendientes`}
          className={`rounded-lg px-3 py-1.5 transition-colors ${
            soloHoy
              ? 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
              : 'bg-[var(--color-bg-secondary)] font-medium'
          }`}
        >
          Todos
        </Link>
        <Link
          href={`/${tenantSlug}/admin/pendientes?dia=hoy`}
          className={`rounded-lg px-3 py-1.5 transition-colors ${
            soloHoy
              ? 'bg-[var(--color-bg-secondary)] font-medium'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
          }`}
        >
          Lo de hoy
        </Link>
      </div>

      <Bandeja
        tenantId={current.tenant.id}
        puestos={puestosVista}
        vacioPorFiltro={soloHoy}
        filas={filas.map((f) => ({
          id: f.tarea.id,
          title: f.tarea.title,
          description: f.tarea.description,
          location: f.tarea.location,
          status: f.tarea.status,
          createdAt: f.tarea.createdAt.toISOString(),
          puesto: f.puesto ? { id: f.puesto.id, name: f.puesto.name } : null,
        }))}
      />
    </div>
  );
}
