'use server';

import { revalidatePath } from 'next/cache';
import { locationService } from '@/server/services/location.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { fail, ok, type ActionResult } from './result';
import type { Location } from '@a-la-mano/db';

async function revalidar(tenantId: string) {
  const tenant = await tenantRepository.findById(tenantId);
  if (!tenant) return;
  revalidatePath(`/${tenant.slug}/reportar`);
  revalidatePath(`/${tenant.slug}/admin`);
  revalidatePath(`/${tenant.slug}/admin/lugares`);
  revalidatePath(`/${tenant.slug}/admin/reportes`);
}

export async function crearLugarAction(
  tenantId: string,
  kind: string,
  name: string,
  parentId?: string | null,
): Promise<ActionResult<{ lugar: Location }>> {
  try {
    const lugar = await locationService.crear(tenantId, { kind, name, parentId: parentId ?? null });
    await revalidar(tenantId);
    return ok({ lugar });
  } catch (error) {
    return fail(error);
  }
}

export async function crearTorreConPisosAction(
  tenantId: string,
  name: string,
  pisos: number,
): Promise<ActionResult<{ torre: Location }>> {
  try {
    const torre = await locationService.crearTorreConPisos(tenantId, name, pisos);
    await revalidar(tenantId);
    return ok({ torre });
  } catch (error) {
    return fail(error);
  }
}

export async function crearZonasAction(
  tenantId: string,
  nombres: string[],
): Promise<ActionResult<{ creadas: number }>> {
  try {
    const creadas = await locationService.crearZonas(tenantId, nombres);
    await revalidar(tenantId);
    return ok({ creadas });
  } catch (error) {
    return fail(error);
  }
}

export async function renombrarLugarAction(
  tenantId: string,
  lugarId: string,
  name: string,
): Promise<ActionResult<{ lugar: Location }>> {
  try {
    const lugar = await locationService.renombrar(tenantId, lugarId, name);
    await revalidar(tenantId);
    return ok({ lugar });
  } catch (error) {
    return fail(error);
  }
}

export async function cambiarEstadoLugarAction(
  tenantId: string,
  lugarId: string,
  activo: boolean,
): Promise<ActionResult<{ lugar: Location }>> {
  try {
    const lugar = await locationService.cambiarEstado(tenantId, lugarId, activo);
    await revalidar(tenantId);
    return ok({ lugar });
  } catch (error) {
    return fail(error);
  }
}

export async function eliminarLugarAction(
  tenantId: string,
  lugarId: string,
): Promise<ActionResult<null>> {
  try {
    await locationService.eliminar(tenantId, lugarId);
    await revalidar(tenantId);
    return ok(null);
  } catch (error) {
    return fail(error);
  }
}
