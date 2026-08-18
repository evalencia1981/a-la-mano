import 'server-only';
import { auditRepository } from '@/server/repositories/audit.repository';

export interface AuditPayload {
  /** Null para acciones de plataforma sin comunidad (ej. categorías globales). */
  tenantId: string | null;
  userId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Servicio de bitácora. No falla si el insert tira error — el audit
 * es best-effort, no debe bloquear la operación principal. Se logea
 * en consola para debugging.
 */
export const auditService = {
  async log(payload: AuditPayload): Promise<void> {
    try {
      await auditRepository.insert({
        tenantId: payload.tenantId,
        userId: payload.userId ?? null,
        action: payload.action,
        resourceType: payload.resourceType ?? null,
        resourceId: payload.resourceId ?? null,
        metadata: payload.metadata ?? null,
      });
    } catch (error) {
      console.error('[audit] Falló escribir entrada:', error, payload);
    }
  },

  async list(tenantId: string, limit?: number) {
    return auditRepository.listByTenant(tenantId, limit);
  },
};
