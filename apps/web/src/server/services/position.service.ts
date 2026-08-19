import 'server-only';
import { z } from 'zod';
import { positionRepository } from '@/server/repositories/position.repository';
import { auditService } from './audit.service';
import { assertRole } from '@/lib/auth/guards';
import { normalizePhone } from '@/lib/contact';
import { normalizarLugar } from '@/lib/location-types';
import type { Position } from '@a-la-mano/db';

const MAX_PUESTOS = 40;

const puestoSchema = z.object({
  name: z.string().trim().min(1, 'Poné un nombre.').max(60),
  phone: z.string().trim().max(30).optional().nullable(),
  icon: z.string().trim().max(40).optional().nullable(),
});

export type PuestoInput = z.input<typeof puestoSchema>;

/**
 * Puestos de trabajo de la comunidad.
 *
 * Todo lo de acá es de owner/admin: un puesto define a quién se le despacha
 * trabajo y con qué número de WhatsApp, y eso no lo toca un vecino.
 *
 * Reusa `normalizarLugar` como clave de matching. No es un préstamo
 * caprichoso: hace exactamente lo que hace falta —minúsculas, sin acentos,
 * sin espacios— y tener dos normalizadores casi iguales termina en que uno
 * de los dos se arregla y el otro no.
 */
export const positionService = {
  async list(tenantId: string): Promise<Position[]> {
    await assertRole(tenantId, ['owner', 'admin']);
    return positionRepository.listByTenant(tenantId);
  },

  async listActivos(tenantId: string): Promise<Position[]> {
    await assertRole(tenantId, ['owner', 'admin']);
    return positionRepository.listActivos(tenantId);
  },

  /** Los puestos con cuántos pendientes abiertos tiene cada uno. */
  async listConCarga(tenantId: string): Promise<Array<Position & { abiertas: number }>> {
    await assertRole(tenantId, ['owner', 'admin']);
    const [puestos, carga] = await Promise.all([
      positionRepository.listByTenant(tenantId),
      positionRepository.contarAbiertasPorPuesto(tenantId),
    ]);
    return puestos.map((p) => ({ ...p, abiertas: carga.get(p.id) ?? 0 }));
  },

  async crear(tenantId: string, input: PuestoInput): Promise<Position> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const datos = puestoSchema.parse(input);

    if ((await positionRepository.listByTenant(tenantId)).length >= MAX_PUESTOS) {
      throw new Error(`No se pueden tener más de ${MAX_PUESTOS} puestos.`);
    }

    const normalized = normalizarLugar(datos.name);
    if (!normalized) throw new Error('Ese nombre no sirve como puesto.');

    const repetido = await positionRepository.findByNormalized(tenantId, normalized);
    if (repetido) throw new Error(`"${repetido.name}" ya existe.`);

    const phone = datos.phone?.trim() || null;
    const puesto = await positionRepository.create({
      tenantId,
      name: datos.name,
      normalized,
      phone,
      phoneNormalized: phone ? normalizePhone(phone) : null,
      icon: datos.icon?.trim() || null,
      sortOrder: 0,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'position.created',
      resourceType: 'position',
      resourceId: puesto.id,
      metadata: { name: puesto.name, conTelefono: Boolean(phone) },
    });

    return puesto;
  },

  /** Alta en lote desde los sugeridos. Lo repetido se saltea en silencio. */
  async crearVarios(
    tenantId: string,
    entradas: Array<{ name: string; icon?: string | null }>,
  ): Promise<number> {
    await assertRole(tenantId, ['owner', 'admin']);
    let creados = 0;
    for (const entrada of entradas) {
      try {
        await this.crear(tenantId, entrada);
        creados += 1;
      } catch {
        /* Ya existía o no pasó validación: seguimos con los demás. */
      }
    }
    return creados;
  },

  async actualizar(tenantId: string, puestoId: string, input: PuestoInput): Promise<Position> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const actual = await positionRepository.getById(puestoId);
    if (!actual || actual.tenantId !== tenantId) throw new Error('Puesto no encontrado.');

    const datos = puestoSchema.parse(input);
    const normalized = normalizarLugar(datos.name);
    if (!normalized) throw new Error('Ese nombre no sirve como puesto.');

    const repetido = await positionRepository.findByNormalized(tenantId, normalized);
    if (repetido && repetido.id !== puestoId) throw new Error(`"${repetido.name}" ya existe.`);

    const phone = datos.phone?.trim() || null;
    const puesto = await positionRepository.update(puestoId, {
      name: datos.name,
      normalized,
      phone,
      phoneNormalized: phone ? normalizePhone(phone) : null,
      icon: datos.icon?.trim() || actual.icon,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'position.updated',
      resourceType: 'position',
      resourceId: puestoId,
      metadata: { antes: actual.name, ahora: puesto.name },
    });

    return puesto;
  },

  async cambiarEstado(tenantId: string, puestoId: string, activo: boolean): Promise<Position> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const actual = await positionRepository.getById(puestoId);
    if (!actual || actual.tenantId !== tenantId) throw new Error('Puesto no encontrado.');

    const puesto = await positionRepository.update(puestoId, { isActive: activo });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: activo ? 'position.reactivated' : 'position.deactivated',
      resourceType: 'position',
      resourceId: puestoId,
      metadata: { name: actual.name },
    });

    return puesto;
  },

  /**
   * Solo se borra un puesto al que nunca se le despachó nada. Con historial
   * se da de baja: si no, las tareas viejas pierden a quién se le habían
   * asignado y la bitácora deja de poder explicarse.
   */
  async eliminar(tenantId: string, puestoId: string): Promise<void> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const actual = await positionRepository.getById(puestoId);
    if (!actual || actual.tenantId !== tenantId) throw new Error('Puesto no encontrado.');

    const tareas = await positionRepository.countTareas(puestoId);
    if (tareas > 0) {
      throw new Error(
        `"${actual.name}" tiene ${tareas} ${tareas === 1 ? 'pendiente' : 'pendientes'}. Dalo de baja en vez de borrarlo para no perder el historial.`,
      );
    }

    await positionRepository.delete(puestoId);

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'position.deleted',
      resourceType: 'position',
      resourceId: puestoId,
      metadata: { name: actual.name },
    });
  },
};

export { puestoSchema };
