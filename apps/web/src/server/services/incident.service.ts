import 'server-only';
import { z } from 'zod';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { auditService } from './audit.service';
import { assertRole, assertTenantMember } from '@/lib/auth/guards';
import { TIPOS_INCIDENTE } from '@/lib/incident-types';

const SLUGS = TIPOS_INCIDENTE.map((t) => t.slug) as [string, ...string[]];

const crearReporteSchema = z.object({
  type: z.enum(SLUGS, { errorMap: () => ({ message: 'Elegí qué pasó.' }) }),
  location: z.string().max(120).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});

export type CrearReporteInput = z.input<typeof crearReporteSchema>;

const ESTADOS = ['nuevo', 'en_proceso', 'resuelto'] as const;

export const incidentService = {
  /**
   * Cualquier miembro puede reportar. No hay moderación previa: si reportar
   * costara trámite, nadie reportaría y el módulo quedaría vacío. El control
   * es que quien reporta queda identificado ante la administración.
   */
  async crear(tenantId: string, input: CrearReporteInput) {
    const { user } = await assertTenantMember(tenantId);
    const datos = crearReporteSchema.parse(input);

    const reporte = await incidentRepository.create({
      tenantId,
      reportedBy: user.id,
      type: datos.type,
      location: datos.location?.trim() || null,
      description: datos.description?.trim() || null,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'incident.reported',
      resourceType: 'incident_report',
      resourceId: reporte.id,
      metadata: { type: datos.type, location: datos.location },
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
