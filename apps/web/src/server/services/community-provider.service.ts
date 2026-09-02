import 'server-only';
import { z } from 'zod';
import {
  communityProviderRepository,
  type CommunityProviderListFilters,
} from '@/server/repositories/community-provider.repository';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { providerService, providerInputSchema } from './provider.service';
import { auditService } from './audit.service';
import { assertRole, assertTenantMember } from '@/lib/auth/guards';
import { MINIMO_CALIFICACIONES, PROMEDIO_MINIMO } from '@/lib/rating';



const addProviderSchema = providerInputSchema.extend({
  localNotes: z.string().max(2000).optional().nullable(),
});

export type AddProviderInput = z.input<typeof addProviderSchema>;

export const communityProviderService = {
  async listInTenant(tenantId: string, filters: CommunityProviderListFilters = {}) {
    await assertTenantMember(tenantId);
    return communityProviderRepository.listByTenant(tenantId, {
      minimoCalificaciones: MINIMO_CALIFICACIONES,
      ...filters,
    });
  },

  /** Total de proveedores activos. Para contadores de UI. */
  async countInTenant(tenantId: string) {
    await assertTenantMember(tenantId);
    return communityProviderRepository.countByTenant(tenantId);
  },

  /**
   * Cuántos proveedores hay por categoría en esta comunidad. Lo usa la
   * grilla de categorías para mostrar el dato al pie de cada ficha y para
   * bajar al final las que la comunidad todavía no tiene.
   */
  async countByCategoryInTenant(tenantId: string) {
    await assertTenantMember(tenantId);
    return communityProviderRepository.countByCategory(tenantId, MINIMO_CALIFICACIONES);
  },

  async listInTenantAdmin(tenantId: string, filters: CommunityProviderListFilters = {}) {
    await assertRole(tenantId, ['owner', 'admin']);
    return communityProviderRepository.listByTenant(tenantId, {
      minimoCalificaciones: MINIMO_CALIFICACIONES,
      ...filters,
      includeInactive: true,
    });
  },

  async getDetails(tenantId: string, communityProviderId: string) {
    await assertTenantMember(tenantId);
    const row = await communityProviderRepository.getWithDetails(communityProviderId);
    if (!row) return null;
    if (row.communityProvider.tenantId !== tenantId) return null;
    return row;
  },

  /**
   * Proveedores probados en comunidades cercanas que esta todavía no tiene.
   *
   * Nunca se agregan solos: esto devuelve candidatos para que un admin
   * decida. Un proveedor con buena calificación en otra unidad no
   * necesariamente atiende esta zona ni tiene cupo, y el directorio vale
   * justamente porque alguien de la comunidad respondió por quien está ahí.
   *
   * Devuelve lista vacía si la comunidad no cargó su ciudad — sin eso no hay
   * forma de saber qué le queda cerca.
   */
  async listRecomendados(tenantId: string, limit = 12) {
    await assertRole(tenantId, ['owner', 'admin']);
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant?.cityNormalized) return [];

    return communityProviderRepository.listRecomendados(tenantId, {
      ciudadNormalizada: tenant.cityNormalized,
      sectorNormalizado: tenant.sectorNormalized,
      minimoCalificaciones: MINIMO_CALIFICACIONES,
      promedioMinimo: PROMEDIO_MINIMO,
      limit,
    });
  },

  /**
   * Agrega a la comunidad un proveedor que ya existe (viene de recomendados).
   * A diferencia de `addProvider`, no crea ni edita el proveedor global: solo
   * lo asocia. Los datos del proveedor son de quien lo cargó primero.
   */
  async adoptarRecomendado(tenantId: string, providerId: string) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);

    const yaEsta = await communityProviderRepository.findByTenantAndProvider(tenantId, providerId);
    if (yaEsta) {
      throw new Error('Este proveedor ya está en tu comunidad.');
    }

    const cp = await communityProviderRepository.create({
      tenantId,
      providerId,
      addedBy: user.id,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'community_provider.adopted',
      resourceType: 'community_provider',
      resourceId: cp.id,
      metadata: { providerId, origen: 'recomendado' },
    });

    return cp;
  },

  /**
   * Punto de entrada principal para agregar un proveedor a una comunidad.
   *  - Normaliza phone, busca o crea el provider global.
   *  - Verifica que no exista ya la asociación en este tenant.
   *  - Crea community_provider con localNotes.
   *  - Registra en audit log.
   */
  async addProvider(
    tenantId: string,
    input: AddProviderInput,
  ) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const parsed = addProviderSchema.parse(input);

    const { provider, wasCreated } = await providerService.findOrCreate(
      {
        name: parsed.name,
        categoryId: parsed.categoryId,
        city: parsed.city,
        neighborhood: parsed.neighborhood ?? null,
        phone: parsed.phone,
        isWhatsapp: parsed.isWhatsapp,
        whatsappNumber: parsed.whatsappNumber ?? null,
        instagramHandle: parsed.instagramHandle ?? null,
        websiteUrl: parsed.websiteUrl ?? null,
        description: parsed.description ?? null,
      },
      user.id,
    );

    const existing = await communityProviderRepository.findByTenantAndProvider(
      tenantId,
      provider.id,
    );
    if (existing) {
      throw new Error('Este proveedor ya está agregado en tu comunidad.');
    }

    const cp = await communityProviderRepository.create({
      tenantId,
      providerId: provider.id,
      localNotes: parsed.localNotes ?? null,
      addedBy: user.id,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: wasCreated ? 'community_provider.added_new' : 'community_provider.added_existing',
      resourceType: 'community_provider',
      resourceId: cp.id,
      metadata: { providerId: provider.id, providerName: provider.name },
    });

    return { communityProvider: cp, provider, wasCreated };
  },

  async remove(tenantId: string, communityProviderId: string) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const existing = await communityProviderRepository.getById(communityProviderId);
    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('No existe en esta comunidad.');
    }
    const cp = await communityProviderRepository.setActive(communityProviderId, false);
    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'community_provider.removed',
      resourceType: 'community_provider',
      resourceId: communityProviderId,
    });
    return cp;
  },

  async restore(tenantId: string, communityProviderId: string) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const cp = await communityProviderRepository.setActive(communityProviderId, true);
    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'community_provider.restored',
      resourceType: 'community_provider',
      resourceId: communityProviderId,
    });
    return cp;
  },

  async updateLocalNotes(tenantId: string, communityProviderId: string, notes: string | null) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const cp = await communityProviderRepository.update(communityProviderId, {
      localNotes: notes,
    });
    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'community_provider.notes_updated',
      resourceType: 'community_provider',
      resourceId: communityProviderId,
    });
    return cp;
  },
};

export { addProviderSchema };
