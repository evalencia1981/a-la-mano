import 'server-only';
import { z } from 'zod';
import { positionRepository } from '@/server/repositories/position.repository';
import { taskRepository, type FilaTarea } from '@/server/repositories/task.repository';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { auditService } from './audit.service';
import { locationService } from './location.service';
import { assertRole } from '@/lib/auth/guards';
import { buscarLugar } from '@/lib/location-types';
import { armarMensajeTarea, esEstadoTarea, exigeMotivo } from '@/lib/task-types';
import { enlaceDeTarea, generarTokenDeTarea, vencimientoDeEnlace } from '@/lib/task-token';
import { getWhatsappUrlDeNumero } from '@/lib/contact';
import { env } from '@/env';
import type { Position, Task, TaskDispatch, TaskUpdate } from '@a-la-mano/db';

const crearTareaSchema = z.object({
  /** Lo único obligatorio. Todo lo demás se completa después. */
  title: z.string().trim().min(1, 'Escribí qué hay que hacer.').max(200),
  description: z.string().max(2000).optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
});

export type CrearTareaInput = z.input<typeof crearTareaSchema>;

export interface DetalleTarea {
  tarea: Task;
  puesto: Position | null;
  bitacora: TaskUpdate[];
  despachos: TaskDispatch[];
}

/** Lo que ve quien abre el enlace de WhatsApp, sin cuenta. */
export interface VistaEnlace {
  tarea: Task;
  puesto: Position | null;
  comunidad: string;
  destinatario: string;
  bitacora: TaskUpdate[];
  /** Vencido, revocado o ya resuelto: se muestra pero no se puede tocar. */
  editable: boolean;
  motivoBloqueo: string | null;
}

export const taskService = {
  /**
   * Meter un pendiente.
   *
   * La regla es una sola y manda sobre todo lo demás: **nada bloquea el
   * guardado salvo que no haya texto.** Sin puesto, sin lugar, sin
   * descripción, se guarda igual. El pendiente que la app se negó a recibir
   * vuelve al audio de WhatsApp, y de ahí no vuelve nunca.
   */
  async crear(tenantId: string, input: CrearTareaInput): Promise<Task> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const datos = crearTareaSchema.parse(input);

    /* Mismo criterio que en los reportes: si el lugar está en el mapa se
     * engancha, y si no, se guarda el texto crudo y ya. */
    const { opciones } = await locationService.mapa(tenantId);
    let locationId: string | null = null;
    let location: string | null = datos.location?.trim() || null;

    if (datos.locationId) {
      const elegido = opciones.find((o) => o.id === datos.locationId);
      if (elegido) {
        locationId = elegido.id;
        location = elegido.rutaCompleta;
      }
    } else if (location) {
      const encontrado = buscarLugar(location, opciones);
      if (encontrado) {
        locationId = encontrado.id;
        location = encontrado.rutaCompleta;
      }
    }

    let positionId: string | null = null;
    if (datos.positionId) {
      const puesto = await positionRepository.getById(datos.positionId);
      if (puesto && puesto.tenantId === tenantId) positionId = puesto.id;
    }

    const tarea = await taskRepository.create({
      tenantId,
      createdBy: user.id,
      title: datos.title,
      description: datos.description?.trim() || null,
      locationId,
      location,
      positionId,
      status: 'pendiente',
    });

    await taskRepository.addUpdate({
      taskId: tarea.id,
      tenantId,
      status: 'pendiente',
      note: null,
      authorId: user.id,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'task.created',
      resourceType: 'task',
      resourceId: tarea.id,
      metadata: { title: tarea.title, conPuesto: positionId !== null, conLugar: locationId !== null },
    });

    return tarea;
  },

  async listBandeja(tenantId: string): Promise<FilaTarea[]> {
    await assertRole(tenantId, ['owner', 'admin']);
    return taskRepository.listBandeja(tenantId);
  },

  /** "Qué reporté hoy". `dia` en hora local del servidor. */
  async listDelDia(tenantId: string, dia: Date): Promise<FilaTarea[]> {
    await assertRole(tenantId, ['owner', 'admin']);
    const desde = new Date(dia);
    desde.setHours(0, 0, 0, 0);
    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + 1);
    return taskRepository.listPorRango(tenantId, desde, hasta);
  },

  async countAbiertas(tenantId: string): Promise<number> {
    await assertRole(tenantId, ['owner', 'admin']);
    return taskRepository.countAbiertas(tenantId);
  },

  async countSinAsignar(tenantId: string): Promise<number> {
    await assertRole(tenantId, ['owner', 'admin']);
    return taskRepository.countSinAsignar(tenantId);
  },

  async detalle(tenantId: string, tareaId: string): Promise<DetalleTarea> {
    await assertRole(tenantId, ['owner', 'admin']);
    const tarea = await taskRepository.getById(tareaId);
    if (!tarea || tarea.tenantId !== tenantId) throw new Error('Pendiente no encontrado.');

    const [puesto, bitacora, despachos] = await Promise.all([
      tarea.positionId ? positionRepository.getById(tarea.positionId) : Promise.resolve(null),
      taskRepository.listUpdates(tareaId),
      taskRepository.listDispatches(tareaId),
    ]);

    return { tarea, puesto, bitacora, despachos };
  },

  /**
   * Cambio de estado desde la administración.
   *
   * `suspendido` exige motivo. Es la única validación rígida del módulo, y
   * está a propósito: su pregunta textual fue "si no lo atendieron, ¿por
   * qué?", y un suspendido sin respuesta a eso es un pendiente perdido con
   * un nombre más prolijo.
   */
  async cambiarEstado(
    tenantId: string,
    tareaId: string,
    estado: string,
    nota?: string | null,
  ): Promise<Task> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    if (!esEstadoTarea(estado)) throw new Error('Estado inválido.');

    const actual = await taskRepository.getById(tareaId);
    if (!actual || actual.tenantId !== tenantId) throw new Error('Pendiente no encontrado.');

    const motivo = nota?.trim() || null;
    if (exigeMotivo(estado) && !motivo) {
      throw new Error('Para suspender hay que decir por qué.');
    }

    const resuelto = estado === 'resuelto';
    const tarea = await taskRepository.update(tareaId, {
      status: estado,
      resolvedAt: resuelto ? new Date() : null,
      resolvedBy: resuelto ? user.id : null,
    });

    await taskRepository.addUpdate({
      taskId: tareaId,
      tenantId,
      status: estado,
      note: motivo,
      authorId: user.id,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: `task.${estado}`,
      resourceType: 'task',
      resourceId: tareaId,
      metadata: { nota: motivo },
    });

    return tarea;
  },

  /** Asignar o reasignar el puesto. Pasar null lo deja sin dueño otra vez. */
  async asignar(tenantId: string, tareaId: string, positionId: string | null): Promise<Task> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const actual = await taskRepository.getById(tareaId);
    if (!actual || actual.tenantId !== tenantId) throw new Error('Pendiente no encontrado.');

    let puesto: Position | null = null;
    if (positionId) {
      puesto = await positionRepository.getById(positionId);
      if (!puesto || puesto.tenantId !== tenantId) throw new Error('Puesto no encontrado.');
    }

    const tarea = await taskRepository.update(tareaId, { positionId: puesto?.id ?? null });

    await taskRepository.addUpdate({
      taskId: tareaId,
      tenantId,
      status: null,
      note: puesto ? `Asignado a ${puesto.name}.` : 'Quedó sin asignar.',
      authorId: user.id,
    });

    return tarea;
  },

  async actualizarDatos(
    tenantId: string,
    tareaId: string,
    datos: { title?: string; description?: string | null },
  ): Promise<Task> {
    await assertRole(tenantId, ['owner', 'admin']);
    const actual = await taskRepository.getById(tareaId);
    if (!actual || actual.tenantId !== tenantId) throw new Error('Pendiente no encontrado.');

    const title = datos.title?.trim();
    if (title !== undefined && !title) throw new Error('El pendiente necesita un texto.');

    return taskRepository.update(tareaId, {
      ...(title ? { title } : {}),
      ...(datos.description !== undefined ? { description: datos.description?.trim() || null } : {}),
    });
  },

  /**
   * Despacha la tarea al puesto y devuelve la URL de WhatsApp ya armada.
   *
   * El envío no lo hace el sistema: `wa.me` abre el chat con el mensaje
   * escrito y la persona toca enviar. Es la limitación que aceptamos a
   * cambio de que funcione esta semana y sin costo. Lo que sí hace el
   * sistema es meter adentro del mensaje un enlace que vuelve — eso es lo
   * que cierra el ciclo que WhatsApp solo no puede cerrar.
   */
  async despachar(
    tenantId: string,
    tareaId: string,
    positionId: string,
  ): Promise<{ urlWhatsapp: string | null; enlace: string; despacho: TaskDispatch }> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);

    const tarea = await taskRepository.getById(tareaId);
    if (!tarea || tarea.tenantId !== tenantId) throw new Error('Pendiente no encontrado.');

    const puesto = await positionRepository.getById(positionId);
    if (!puesto || puesto.tenantId !== tenantId) throw new Error('Puesto no encontrado.');

    const ahora = new Date();
    const despacho = await taskRepository.createDispatch({
      taskId: tareaId,
      tenantId,
      positionId: puesto.id,
      recipientLabel: puesto.name,
      phone: puesto.phone,
      token: generarTokenDeTarea(),
      expiresAt: vencimientoDeEnlace(ahora),
    });

    /* Despachar implica asignar: si se le manda a portería, es de portería. */
    if (tarea.positionId !== puesto.id) {
      await taskRepository.update(tareaId, { positionId: puesto.id });
    }

    await taskRepository.addUpdate({
      taskId: tareaId,
      tenantId,
      status: null,
      note: `Despachado a ${puesto.name}.`,
      authorId: user.id,
    });

    /* El nombre de la comunidad va en el mensaje porque quien recibe suele
     * trabajar para varias unidades: sin eso no sabe de cuál le hablan. */
    const comunidad = await tenantRepository.findById(tenantId);

    const enlace = enlaceDeTarea(env.NEXT_PUBLIC_SITE_URL, despacho.token);
    const mensaje = armarMensajeTarea({
      titulo: tarea.title,
      lugar: tarea.location,
      comunidad: comunidad?.name ?? 'la comunidad',
      enlace,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'task.dispatched',
      resourceType: 'task',
      resourceId: tareaId,
      metadata: { puesto: puesto.name, conTelefono: Boolean(puesto.phoneNormalized) },
    });

    return {
      urlWhatsapp: getWhatsappUrlDeNumero(puesto.phoneNormalized, mensaje),
      enlace,
      despacho,
    };
  },

  async revocarDespacho(tenantId: string, despachoId: string): Promise<void> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    await taskRepository.revokeDispatch(despachoId, new Date());
    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'task.dispatch_revoked',
      resourceType: 'task_dispatch',
      resourceId: despachoId,
    });
  },

  /* ------------------------------------------------------------------ */
  /* Acceso por enlace — SIN cuenta. No hay `assert*` acá a propósito:   */
  /* la autorización es el token, y se valida en cada llamada.          */
  /* ------------------------------------------------------------------ */

  async verPorToken(token: string): Promise<VistaEnlace | null> {
    const fila = await taskRepository.findByToken(token);
    if (!fila) return null;

    const bitacora = await taskRepository.listUpdates(fila.tarea.id);
    const { motivo } = evaluarEnlace(fila.despacho, fila.tarea);

    return {
      tarea: fila.tarea,
      puesto: fila.puesto,
      comunidad: fila.comunidad.name,
      destinatario: fila.despacho.recipientLabel,
      bitacora,
      editable: motivo === null,
      motivoBloqueo: motivo,
    };
  },

  /**
   * Quien recibió el enlace mueve el estado.
   *
   * Solo puede llevarlo a "en proceso", "suspendido" o "resuelto": volver a
   * "pendiente" es una decisión de la administración, no de quien lo está
   * ejecutando. Y suspender exige motivo, igual que del otro lado.
   */
  async actualizarPorToken(
    token: string,
    estado: string,
    nota?: string | null,
  ): Promise<{ tarea: Task }> {
    const fila = await taskRepository.findByToken(token);
    if (!fila) throw new Error('Este enlace no es válido.');

    const { motivo: bloqueo } = evaluarEnlace(fila.despacho, fila.tarea);
    if (bloqueo) throw new Error(bloqueo);

    if (!esEstadoTarea(estado) || estado === 'pendiente') {
      throw new Error('Estado inválido.');
    }

    const nota_ = nota?.trim() || null;
    if (exigeMotivo(estado) && !nota_) {
      throw new Error('Para suspender hay que decir por qué.');
    }

    const resuelto = estado === 'resuelto';
    const tarea = await taskRepository.update(fila.tarea.id, {
      status: estado,
      resolvedAt: resuelto ? new Date() : null,
      /* Sin cuenta no hay `profile` a quién atribuirlo: queda en la
       * bitácora con el nombre del puesto. */
      resolvedBy: null,
    });

    await taskRepository.addUpdate({
      taskId: fila.tarea.id,
      tenantId: fila.despacho.tenantId,
      status: estado,
      note: nota_,
      authorLabel: fila.despacho.recipientLabel,
    });

    return { tarea };
  },
};

/**
 * Por qué un enlace no se puede usar, o null si sí se puede.
 *
 * Un enlace de WhatsApp se reenvía: termina en el grupo del edificio, en el
 * chat de otro proveedor, en cualquier lado. Por eso caduca, se puede
 * revocar, y deja de aceptar cambios cuando la tarea ya se cerró.
 */
function evaluarEnlace(
  despacho: TaskDispatch,
  tarea: Task,
): { motivo: string | null } {
  if (despacho.revokedAt) return { motivo: 'La administración dio de baja este enlace.' };
  if (despacho.expiresAt && despacho.expiresAt.getTime() < Date.now()) {
    return { motivo: 'Este enlace venció. Pedile uno nuevo a la administración.' };
  }
  if (tarea.status === 'resuelto') return { motivo: 'Este pendiente ya está resuelto.' };
  return { motivo: null };
}

export { crearTareaSchema };
