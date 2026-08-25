import 'server-only';
import { z } from 'zod';
import { communityProviderRepository } from '@/server/repositories/community-provider.repository';
import { providerRepository, type ProviderSearchFilters } from '@/server/repositories/provider.repository';
import { auditService } from './audit.service';
import { assertAuthenticated, assertRole } from '@/lib/auth/guards';
import type { Provider } from '@a-la-mano/db';

/**
 * Solo dígitos. Es la clave de matching para detectar que dos rows hablan
 * del mismo proveedor (mismo teléfono → mismo proveedor).
 *
 * El `+` y los espacios se quitan; los códigos de país quedan como prefijos
 * numéricos (ej "57" para Colombia).
 */
export function normalizePhone(phone: string): string {
  return (phone ?? '').replace(/\D/g, '');
}

const providerInputSchema = z.object({
  name: z.string().min(2).max(120),
  categoryId: z.string().uuid(),
  city: z.string().min(2).max(80),
  neighborhood: z.string().max(80).optional().nullable(),
  phone: z.string().min(7).max(30),
  isWhatsapp: z.boolean().default(true),
  whatsappNumber: z.string().min(7).max(30).optional().nullable(),
  instagramHandle: z.string().max(60).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});

export type ProviderInput = z.input<typeof providerInputSchema>;

export interface FindOrCreateResult {
  provider: Provider;
  wasCreated: boolean;
}

export const providerService = {
  /**
   * Busca por phoneNormalized. Si existe → lo devuelve. Si no → lo crea.
   *
   * Regla central de A la Mano: nunca duplicar providers — un mismo plomero
   * que ya esté en otra comunidad debe matchear acá.
   */
  async findOrCreate(input: ProviderInput, createdBy: string): Promise<FindOrCreateResult> {
    const parsed = providerInputSchema.parse(input);
    const phoneNormalized = normalizePhone(parsed.phone);
    if (phoneNormalized.length < 7) {
      throw new Error('Teléfono inválido. Debe tener al menos 7 dígitos.');
    }
    const whatsappNormalized = parsed.whatsappNumber
      ? normalizePhone(parsed.whatsappNumber)
      : null;

    const existing = await providerRepository.getByPhoneNormalized(phoneNormalized);
    if (existing) {
      return { provider: existing, wasCreated: false };
    }

    const provider = await providerRepository.create({
      name: parsed.name,
      categoryId: parsed.categoryId,
      city: parsed.city,
      neighborhood: parsed.neighborhood ?? null,
      phone: parsed.phone,
      phoneNormalized,
      isWhatsapp: parsed.isWhatsapp,
      whatsappNumber: parsed.whatsappNumber ?? null,
      whatsappNormalized,
      instagramHandle: parsed.instagramHandle ?? null,
      websiteUrl: parsed.websiteUrl ?? null,
      description: parsed.description ?? null,
      createdBy,
    });
    return { provider, wasCreated: true };
  },

  async update(id: string, input: Partial<ProviderInput>) {
    const parsed = providerInputSchema.partial().parse(input);
    const data: Record<string, unknown> = { ...parsed };
    if (parsed.phone) {
      data.phoneNormalized = normalizePhone(parsed.phone);
    }
    if (parsed.whatsappNumber !== undefined) {
      data.whatsappNormalized = parsed.whatsappNumber
        ? normalizePhone(parsed.whatsappNumber)
        : null;
    }
    return providerRepository.update(id, data);
  },

  /**
   * Edita la ficha de un proveedor desde la administración de una comunidad.
   *
   * Hay una consecuencia acá que conviene tener presente: **`providers` es
   * una entidad global**. El mismo plomero puede estar en el directorio de
   * cinco copropiedades, y editarle el teléfono se lo cambia a las cinco.
   *
   * Se permite igual, y a propósito: un teléfono viejo no le sirve a nadie,
   * y el que primero se entera de que cambió es justamente la comunidad que
   * lo acaba de llamar. Lo que sí hacemos es exigir que quien edita sea
   * administrador de una comunidad que **tenga** a ese proveedor, y avisarle
   * en la UI a cuántas otras les afecta.
   *
   * Las notas locales, que son lo único verdaderamente propio de cada
   * comunidad, viven en `community_providers` y no se tocan desde acá.
   */
  async updateFromTenant(tenantId: string, providerId: string, input: Partial<ProviderInput>) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);

    /* Que el proveedor esté en el directorio de esta comunidad es lo que
     * habilita a editarlo. Sin esto, un admin podría editar la ficha de
     * cualquier proveedor de la plataforma pasando un id a mano. */
    const asociacion = await communityProviderRepository.findByTenantAndProvider(
      tenantId,
      providerId,
    );
    if (!asociacion) {
      throw new Error('Ese proveedor no está en el directorio de esta comunidad.');
    }

    const actual = await providerRepository.getById(providerId);
    if (!actual) throw new Error('Proveedor no encontrado.');

    /* `phone_normalized` tiene un unique global. Sin este chequeo, poner un
     * teléfono que ya es de otro proveedor revienta con un error de base
     * incomprensible en vez de decir qué pasó. */
    if (input.phone) {
      const normalizado = normalizePhone(input.phone);
      if (normalizado.length < 7) {
        throw new Error('Teléfono inválido. Debe tener al menos 7 dígitos.');
      }
      const duenio = await providerRepository.getByPhoneNormalized(normalizado);
      if (duenio && duenio.id !== providerId) {
        throw new Error(
          `Ese número ya es de "${duenio.name}". Dos proveedores no pueden compartir teléfono: es la clave con la que se reconocen entre comunidades.`,
        );
      }
    }

    const provider = await this.update(providerId, input);

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'provider.updated',
      resourceType: 'provider',
      resourceId: providerId,
      metadata: {
        name: provider.name,
        cambioTelefono: Boolean(input.phone && input.phone !== actual.phone),
        comunidadesAfectadas: actual.communityCount,
      },
    });

    return provider;
  },

  async getById(id: string) {
    return providerRepository.getById(id);
  },

  async search(filters: ProviderSearchFilters = {}) {
    await assertAuthenticated();
    return providerRepository.search(filters);
  },
};

export { providerInputSchema };
