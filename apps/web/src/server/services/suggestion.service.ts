import 'server-only';
import { z } from 'zod';
import { suggestionRepository } from '@/server/repositories/suggestion.repository';
import { communityProviderRepository } from '@/server/repositories/community-provider.repository';
import { providerService, normalizePhone } from './provider.service';
import { auditService } from './audit.service';
import { assertRole, assertTenantMember } from '@/lib/auth/guards';

const createSuggestionSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(30),
  categoryId: z.string().uuid(),
  city: z.string().min(2).max(80),
  neighborhood: z.string().max(80).optional().nullable(),
  isWhatsapp: z.boolean().default(true),
  whatsappNumber: z.string().min(7).max(30).optional().nullable(),
  instagramHandle: z.string().max(60).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  memberNote: z.string().max(500).optional().nullable(),
});

export type CreateSuggestionInput = z.input<typeof createSuggestionSchema>;

export const suggestionService = {
  async create(tenantId: string, input: CreateSuggestionInput) {
    const { user } = await assertTenantMember(tenantId);
    const parsed = createSuggestionSchema.parse(input);

    const suggestion = await suggestionRepository.create({
      tenantId,
      suggestedBy: user.id,
      name: parsed.name,
      phone: parsed.phone,
      phoneNormalized: normalizePhone(parsed.phone),
      categoryId: parsed.categoryId,
      city: parsed.city,
      neighborhood: parsed.neighborhood ?? null,
      isWhatsapp: parsed.isWhatsapp,
      whatsappNumber: parsed.whatsappNumber ?? null,
      instagramHandle: parsed.instagramHandle ?? null,
      description: parsed.description ?? null,
      memberNote: parsed.memberNote ?? null,
      status: 'pending',
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'suggestion.created',
      resourceType: 'suggestion',
      resourceId: suggestion.id,
      metadata: { name: parsed.name, categoryId: parsed.categoryId },
    });

    return suggestion;
  },

  async listPending(tenantId: string) {
    await assertRole(tenantId, ['owner', 'admin']);
    return suggestionRepository.listPending(tenantId);
  },

  async listMine(tenantId: string) {
    const { user } = await assertTenantMember(tenantId);
    const all = await suggestionRepository.listByUser(user.id);
    return all.filter((s) => s.tenantId === tenantId);
  },

  /**
   * Aprueba una sugerencia:
   *  - Crea o reutiliza el provider global por matching de phoneNormalized.
   *  - Si la asociación ya existe en este tenant, falla con error claro.
   *  - Si no, crea community_provider y deja apuntando el resultingCommunityProviderId.
   */
  async approve(tenantId: string, suggestionId: string) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const s = await suggestionRepository.getById(suggestionId);
    if (!s || s.tenantId !== tenantId) {
      throw new Error('Sugerencia no encontrada.');
    }
    if (s.status !== 'pending') {
      throw new Error(`La sugerencia ya está ${s.status}.`);
    }

    const { provider, wasCreated } = await providerService.findOrCreate(
      {
        name: s.name,
        categoryId: s.categoryId,
        city: s.city,
        neighborhood: s.neighborhood,
        phone: s.phone,
        isWhatsapp: s.isWhatsapp ?? true,
        whatsappNumber: s.whatsappNumber,
        instagramHandle: s.instagramHandle,
        description: s.description,
      },
      user.id,
    );

    const existing = await communityProviderRepository.findByTenantAndProvider(
      tenantId,
      provider.id,
    );
    if (existing) {
      throw new Error('Este proveedor ya está en tu comunidad.');
    }

    const cp = await communityProviderRepository.create({
      tenantId,
      providerId: provider.id,
      addedBy: user.id,
    });

    await suggestionRepository.update(suggestionId, {
      status: 'approved',
      reviewedBy: user.id,
      reviewedAt: new Date(),
      resultingCommunityProviderId: cp.id,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'suggestion.approved',
      resourceType: 'suggestion',
      resourceId: suggestionId,
      metadata: {
        providerId: provider.id,
        communityProviderId: cp.id,
        providerWasCreated: wasCreated,
      },
    });

    return { suggestion: s, communityProvider: cp, provider, providerWasCreated: wasCreated };
  },

  async reject(tenantId: string, suggestionId: string, reason: string) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const s = await suggestionRepository.getById(suggestionId);
    if (!s || s.tenantId !== tenantId) throw new Error('Sugerencia no encontrada.');
    if (s.status !== 'pending') throw new Error(`La sugerencia ya está ${s.status}.`);

    const updated = await suggestionRepository.update(suggestionId, {
      status: 'rejected',
      reviewedBy: user.id,
      reviewedAt: new Date(),
      rejectionReason: reason,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'suggestion.rejected',
      resourceType: 'suggestion',
      resourceId: suggestionId,
      metadata: { reason },
    });

    return updated;
  },
};

export { createSuggestionSchema };
