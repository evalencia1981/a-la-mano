'use server';

import { revalidatePath } from 'next/cache';
import { positionService, type PuestoInput } from '@/server/services/position.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { fail, ok, type ActionResult } from './result';
import type { Position } from '@a-la-mano/db';

async function revalidar(tenantId: string) {
  const tenant = await tenantRepository.findById(tenantId);
  if (!tenant) return;
  revalidatePath(`/${tenant.slug}/admin`);
  revalidatePath(`/${tenant.slug}/admin/puestos`);
  revalidatePath(`/${tenant.slug}/admin/pendientes`);
}

export async function crearPuestoAction(
  tenantId: string,
  input: PuestoInput,
): Promise<ActionResult<{ puesto: Position }>> {
  try {
    const puesto = await positionService.crear(tenantId, input);
    await revalidar(tenantId);
    return ok({ puesto });
  } catch (error) {
    return fail(error);
  }
}

export async function crearPuestosAction(
  tenantId: string,
  entradas: Array<{ name: string; icon?: string | null }>,
): Promise<ActionResult<{ creados: number }>> {
  try {
    const creados = await positionService.crearVarios(tenantId, entradas);
    await revalidar(tenantId);
    return ok({ creados });
  } catch (error) {
    return fail(error);
  }
}

export async function actualizarPuestoAction(
  tenantId: string,
  puestoId: string,
  input: PuestoInput,
): Promise<ActionResult<{ puesto: Position }>> {
  try {
    const puesto = await positionService.actualizar(tenantId, puestoId, input);
    await revalidar(tenantId);
    return ok({ puesto });
  } catch (error) {
    return fail(error);
  }
}

export async function cambiarEstadoPuestoAction(
  tenantId: string,
  puestoId: string,
  activo: boolean,
): Promise<ActionResult<{ puesto: Position }>> {
  try {
    const puesto = await positionService.cambiarEstado(tenantId, puestoId, activo);
    await revalidar(tenantId);
    return ok({ puesto });
  } catch (error) {
    return fail(error);
  }
}

export async function eliminarPuestoAction(
  tenantId: string,
  puestoId: string,
): Promise<ActionResult<null>> {
  try {
    await positionService.eliminar(tenantId, puestoId);
    await revalidar(tenantId);
    return ok(null);
  } catch (error) {
    return fail(error);
  }
}
