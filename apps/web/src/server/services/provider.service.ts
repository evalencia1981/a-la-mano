import 'server-only';
import { z } from 'zod';
import { providerRepository, type ProviderSearchFilters } from '@/server/repositories/provider.repository';
import { assertAuthenticated } from '@/lib/auth/guards';
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

  async getById(id: string) {
    return providerRepository.getById(id);
  },

  async search(filters: ProviderSearchFilters = {}) {
    await assertAuthenticated();
    return providerRepository.search(filters);
  },
};

export { providerInputSchema };
