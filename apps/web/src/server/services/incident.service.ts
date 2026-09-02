import 'server-only';
import { z } from 'zod';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { auditService } from './audit.service';
import { locationService } from './location.service';
import { assertRole, assertTenantMember } from '@/lib/auth/guards';
import { sePuedeEditar, TIPOS_INCIDENTE } from '@/lib/incident-types';
import { buscarLugar } from '@/lib/location-types';

const SLUGS = TIPOS_INCIDENTE.map((t) => t.slug) as [string, ...string[]];

const crearReporteSchema = z.object({
  type: z.enum(SLUGS, { errorMap: () => ({ message: 'Elegí qué pasó.' }) }),
  /** Elegido del mapa. Es el camino bueno. */
  locationId: z.string().uuid().optional().nullable(),
  /** Escrito a mano, cuando el lugar todavía no está en el mapa. */
  location: z.string().max(120).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});

export type CrearReporteInput = z.input<typeof crearReporteSchema>;

const ESTADOS = ['nuevo', 'en_proceso', 'resuelto'] as const;

/**
 * Resuelve el lugar de un reporte contra el mapa de la comunidad.
 *
 * Regla que no se negocia: si el lugar no está cargado, el reporte se
 * guarda igual con el texto crudo y queda pendiente de mapear. Un reporte
 * sin ubicación exacta le sirve a alguien; un reporte que la app se negó a
 * recibir no le sirve a nadie, y quien lo intentó no vuelve a intentarlo.
 */
async function resolverLugar(
  tenantId: string,
  datos: { locationId?: string | null; location?: string | null },
): Promise<{ locationId: string | null; location: string | null }> {
  const { opciones } = await locationService.mapa(tenantId);
  let locationId: string | null = null;
  let location: string | null = datos.location?.trim() || null;

  if (datos.locationId) {
    const elegido = opciones.find((o) => o.id === datos.locationId);
    if (!elegido) throw new Error('Ese lugar ya no está en el mapa de la comunidad.');
    locationId = elegido.id;
    location = elegido.rutaCompleta;
  } else if (location) {
    /* Alguien escribió "torre 2" a mano y la torre sí existe: la
     * enganchamos igual en vez de dejarla como pendiente falso. */
    const encontrado = buscarLugar(location, opciones);
    if (encontrado) {
      locationId = encontrado.id;
      location = encontrado.rutaCompleta;
    }
  }

  return { locationId, location };
}

export const incidentService = {
  /**
   * Cualquier miembro puede reportar. No hay moderación previa: si reportar
   * costara trámite, nadie reportaría y el módulo quedaría vacío. El control
   * es que quien reporta queda identificado ante la administración.
   */
  async crear(tenantId: string, input: CrearReporteInput) {
    const { user } = await assertTenantMember(tenantId);
    const datos = crearReporteSchema.parse(input);

    const { locationId, location } = await resolverLugar(tenantId, datos);

    const reporte = await incidentRepository.create({
      tenantId,
      reportedBy: user.id,
      type: datos.type,
      locationId,
      location,
      description: datos.description?.trim() || null,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'incident.reported',
      resourceType: 'incident_report',
      resourceId: reporte.id,
      metadata: { type: datos.type, location, enElMapa: locationId !== null },
    });

    return reporte;
  },

  /**
   * Corregir un reporte propio antes de que la administración lo tome.
   *
   * Quien reporta lo hace de pie y en menos de un minuto, que es
   * exactamente lo que hace que se equivoque: toca "Mascotas" cuando era
   * "Basuras", o pone Torre 2 cuando era la 3. Sin esta función la única
   * salida era reportar de nuevo, y entonces la administración termina con
   * dos reportes del mismo hecho — que es justo lo que rompe el conteo por
   * patrón, que es para lo que sirve todo el módulo.
   *
   * Tres condiciones, y las tres importan:
   *
   *  - Solo el autor. Un administrador no edita el texto de otro: lo suyo
   *    es el estado y la nota de resolución, que quedan a su nombre.
   *  - Solo mientras nadie lo haya tomado (`sePuedeEditar`).
   *  - Queda en la bitácora de auditoría con lo que cambió. El reporte es
   *    lo que después sustenta un caso ante el consejo; una edición
   *    silenciosa le quita justamente ese valor.
   */
  async editar(tenantId: string, reporteId: string, input: CrearReporteInput) {
    const { user } = await assertTenantMember(tenantId);
    const datos = crearReporteSchema.parse(input);

    const actual = await incidentRepository.getById(reporteId);
    if (!actual || actual.tenantId !== tenantId) {
      throw new Error('Reporte no encontrado.');
    }
    if (actual.reportedBy !== user.id) {
      throw new Error('Solo quien hizo el reporte puede corregirlo.');
    }
    if (!sePuedeEditar(actual.status)) {
      throw new Error(
        'La administración ya empezó a gestionar este reporte, así que no se puede corregir. Si algo quedó mal, reportalo aparte.',
      );
    }

    const { locationId, location } = await resolverLugar(tenantId, datos);
    const description = datos.description?.trim() || null;

    const reporte = await incidentRepository.update(reporteId, {
      type: datos.type,
      locationId,
      location,
      description,
    });

    /* Se registra solo lo que efectivamente cambió: una bitácora que repite
     * los tres campos en cada edición no deja ver cuál se tocó. */
    const cambios: Record<string, { antes: unknown; despues: unknown }> = {};
    if (actual.type !== datos.type) cambios.type = { antes: actual.type, despues: datos.type };
    if (actual.location !== location) {
      cambios.location = { antes: actual.location, despues: location };
    }
    if (actual.description !== description) {
      cambios.description = { antes: actual.description, despues: description };
    }

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'incident.edited',
      resourceType: 'incident_report',
      resourceId: reporteId,
      metadata: { cambios },
    });

    return reporte;
  },

  /** Lo que reportó esta persona. Nadie ve los reportes de los demás. */
  async listMios(tenantId: string) {
    const { user } = await assertTenantMember(tenantId);
    return incidentRepository.listByUser(tenantId, user.id);
  },

  async listParaAdmin(tenantId: string) {
    await assertRole(tenantId, ['owner', 'admin']);
    return incidentRepository.listByTenant(tenantId);
  },

  /**
   * Reportes agrupados por tipo y lugar. Es la vista que convierte quejas
   * sueltas en un patrón sustentable.
   */
  async listPatrones(tenantId: string) {
    await assertRole(tenantId, ['owner', 'admin']);
    return incidentRepository.listPatrones(tenantId);
  },

  async countSinResolver(tenantId: string) {
    await assertRole(tenantId, ['owner', 'admin']);
    return incidentRepository.countSinResolver(tenantId);
  },

  /**
   * Cambia el estado. Al resolver queda registrado quién y cuándo — que es
   * justamente la constancia que le sirve a la administración el día que
   * tenga que demostrar qué hizo con lo que le reportaron.
   */
  async cambiarEstado(tenantId: string, reporteId: string, estado: string, nota?: string | null) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    if (!(ESTADOS as readonly string[]).includes(estado)) {
      throw new Error('Estado inválido.');
    }

    const actual = await incidentRepository.getById(reporteId);
    if (!actual || actual.tenantId !== tenantId) {
      throw new Error('Reporte no encontrado.');
    }

    const resuelto = estado === 'resuelto';
    const reporte = await incidentRepository.update(reporteId, {
      status: estado,
      resolutionNote: nota?.trim() || null,
      resolvedBy: resuelto ? user.id : null,
      resolvedAt: resuelto ? new Date() : null,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: `incident.${estado}`,
      resourceType: 'incident_report',
      resourceId: reporteId,
      metadata: { nota },
    });

    return reporte;
  },
};

export { crearReporteSchema };
