import 'server-only';
import { z } from 'zod';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { memberRepository } from '@/server/repositories/member.repository';
import { auditService } from './audit.service';
import { billingService } from './billing.service';
import { assertAuthenticated, assertRole } from '@/lib/auth/guards';
import { slugify } from '@/lib/utils';
import { generarCodigoDeIngreso } from '@/lib/join-code';

const createTenantSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  /** A la Mano: tipo de comunidad. */
  type: z.enum(['residential', 'religious', 'group']).default('residential'),
});

const updateTenantSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  defaultLanguage: z.string().min(2).max(8).optional(),
  timezone: z.string().min(2).max(64).optional(),
  /**
   * Dónde queda la comunidad. Se acepta vacío (queda en null) porque las
   * comunidades creadas antes de esta función no la tienen cargada.
   *
   * Las columnas normalizadas las mantiene un trigger en la base
   * (`core.tenant_normalizar_ubicacion`), así que acá no se tocan.
   */
  city: z.string().max(80).nullable().optional(),
  sector: z.string().max(80).nullable().optional(),
});

const updateBrandingSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Formato HEX, ej #3B82F6')
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Formato HEX, ej #1E40AF')
    .optional(),
});

export const tenantService = {
  async create(input: z.input<typeof createTenantSchema>) {
    const user = await assertAuthenticated();
    const { name, slug: rawSlug, type } = createTenantSchema.parse(input);
    const slug = slugify(rawSlug);

    const existing = await tenantRepository.findBySlug(slug);
    if (existing) {
      throw new Error('El slug ya está en uso. Probá con otro.');
    }

    /* El código del enlace de ingreso se genera junto con la comunidad: es
     * lo primero que va a necesitar para sumar a los residentes. */
    const tenant = await tenantRepository.create({
      name,
      slug,
      type,
      joinCode: generarCodigoDeIngreso(),
    });
    await memberRepository.addMember({
      tenantId: tenant.id,
      userId: user.id,
      role: 'owner',
    });

    // Arrancamos el trial de 30 días.
    await billingService.startTrial(tenant.id);

    await auditService.log({
      tenantId: tenant.id,
      userId: user.id,
      action: 'tenant.created',
      resourceType: 'tenant',
      resourceId: tenant.id,
      metadata: { name, slug, type },
    });

    return tenant;
  },

  async update(tenantId: string, input: z.input<typeof updateTenantSchema>) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const data = updateTenantSchema.parse(input);
    const tenant = await tenantRepository.update(tenantId, data);

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'tenant.updated',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: data,
    });

    return tenant;
  },

  async updateBranding(tenantId: string, input: z.input<typeof updateBrandingSchema>) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const data = updateBrandingSchema.parse(input);
    const tenant = await tenantRepository.update(tenantId, data);

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'tenant.branding_updated',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: data,
    });

    return tenant;
  },
};

export { createTenantSchema, updateTenantSchema, updateBrandingSchema };
