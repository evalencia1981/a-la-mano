'use server';

import { revalidatePath } from 'next/cache';
import { incidentService } from '@/server/services/incident.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { fail, ok, type ActionResult } from './result';
import type { IncidentReport } from '@a-la-mano/db';

async function revalidar(tenantId: string) {
  const tenant = await tenantRepository.findById(tenantId);
  if (!tenant) return;
  revalidatePath(`/${tenant.slug}`);
  revalidatePath(`/${tenant.slug}/reportar`);
  revalidatePath(`/${tenant.slug}/admin`);
  revalidatePath(`/${tenant.slug}/admin/reportes`);
}

export async function crearReporteAction(
  tenantId: string,
  formData: FormData,
): Promise<ActionResult<{ reporte: IncidentReport }>> {
  try {
    const reporte = await incidentService.crear(tenantId, {
      type: String(formData.get('type') ?? ''),
      location: (formData.get('location') as string) || null,
      description: (formData.get('description') as string) || null,
    });
    await revalidar(tenantId);
    return ok({ reporte });
  } catch (error) {
    return fail(error);
  }
}

export async function cambiarEstadoReporteAction(
  tenantId: string,
  reporteId: string,
  estado: string,
  nota?: string | null,
): Promise<ActionResult<{ reporte: IncidentReport }>> {
  try {
    const reporte = await incidentService.cambiarEstado(tenantId, reporteId, estado, nota);
    await revalidar(tenantId);
    return ok({ reporte });
  } catch (error) {
    return fail(error);
  }
}
