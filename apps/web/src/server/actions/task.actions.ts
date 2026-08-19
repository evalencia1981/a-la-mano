'use server';

import { revalidatePath } from 'next/cache';
import { taskService, type CrearTareaInput } from '@/server/services/task.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { fail, ok, type ActionResult } from './result';
import type { Task, TaskDispatch } from '@a-la-mano/db';

async function revalidar(tenantId: string) {
  const tenant = await tenantRepository.findById(tenantId);
  if (!tenant) return;
  revalidatePath(`/${tenant.slug}/admin`);
  revalidatePath(`/${tenant.slug}/admin/pendientes`);
}

export async function crearTareaAction(
  tenantId: string,
  input: CrearTareaInput,
): Promise<ActionResult<{ tarea: Task }>> {
  try {
    const tarea = await taskService.crear(tenantId, input);
    await revalidar(tenantId);
    return ok({ tarea });
  } catch (error) {
    return fail(error);
  }
}

export async function cambiarEstadoTareaAction(
  tenantId: string,
  tareaId: string,
  estado: string,
  nota?: string | null,
): Promise<ActionResult<{ tarea: Task }>> {
  try {
    const tarea = await taskService.cambiarEstado(tenantId, tareaId, estado, nota);
    await revalidar(tenantId);
    return ok({ tarea });
  } catch (error) {
    return fail(error);
  }
}

export async function asignarTareaAction(
  tenantId: string,
  tareaId: string,
  positionId: string | null,
): Promise<ActionResult<{ tarea: Task }>> {
  try {
    const tarea = await taskService.asignar(tenantId, tareaId, positionId);
    await revalidar(tenantId);
    return ok({ tarea });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Genera el enlace y devuelve la URL de WhatsApp lista para abrir.
 *
 * No manda nada: el envío lo hace la persona desde su WhatsApp. Devolvemos
 * también el enlace suelto para el caso en que el puesto no tenga número
 * cargado — así igual se puede copiar y pegar donde sea.
 */
export async function despacharTareaAction(
  tenantId: string,
  tareaId: string,
  positionId: string,
): Promise<ActionResult<{ urlWhatsapp: string | null; enlace: string; despacho: TaskDispatch }>> {
  try {
    const resultado = await taskService.despachar(tenantId, tareaId, positionId);
    await revalidar(tenantId);
    return ok(resultado);
  } catch (error) {
    return fail(error);
  }
}

export async function revocarDespachoAction(
  tenantId: string,
  despachoId: string,
): Promise<ActionResult<null>> {
  try {
    await taskService.revocarDespacho(tenantId, despachoId);
    await revalidar(tenantId);
    return ok(null);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Cambio de estado desde el enlace de WhatsApp, sin cuenta.
 *
 * No lleva `tenantId` ni guard de rol: la autorización es el token, que el
 * service valida en cada llamada (vigencia, revocación y estado de la
 * tarea). Es la única Server Action del proyecto que se puede llamar sin
 * sesión, y por eso no acepta nada más que el token y el movimiento.
 */
export async function actualizarTareaPorEnlaceAction(
  token: string,
  estado: string,
  nota?: string | null,
): Promise<ActionResult<{ tarea: Task }>> {
  try {
    const resultado = await taskService.actualizarPorToken(token, estado, nota);
    revalidatePath(`/tarea/${token}`);
    return ok(resultado);
  } catch (error) {
    return fail(error);
  }
}
