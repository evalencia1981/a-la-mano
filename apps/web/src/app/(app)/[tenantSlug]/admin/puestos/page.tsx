import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { positionService } from '@/server/services/position.service';
import { PuestosEditor } from './puestos-editor';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

/**
 * Los puestos de trabajo de la unidad.
 *
 * Un puesto es a quién se le despacha, no quién lo atiende: el portero rota
 * por turnos y el del aseo se enferma. La tarea le llega al puesto y la ve
 * quien esté.
 */
export default async function PuestosPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const puestos = await positionService.listConCarga(current.tenant.id);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-[var(--color-text-secondary)]">Administración</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">Puestos de trabajo</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          A quién se le despacha el trabajo. El teléfono es la línea del puesto —el celular
          que está en portería, no el de una persona— porque los turnos rotan y una tarea
          asignada a quien salió a las dos de la tarde no la atiende nadie.
        </p>
      </header>

      <PuestosEditor
        tenantId={current.tenant.id}
        puestos={puestos.map((p) => ({
          id: p.id,
          name: p.name,
          normalized: p.normalized,
          phone: p.phone,
          icon: p.icon,
          isActive: p.isActive,
          abiertas: p.abiertas,
        }))}
      />
    </div>
  );
}
