import 'server-only';
import { z } from 'zod';
import { categoryRepository } from '@/server/repositories/category.repository';
import { auditService } from './audit.service';
import { assertAuthenticated } from '@/lib/auth/guards';
import { getPlatformAdmin } from '@/lib/auth/platform-admin';
import { NOMBRES_DE_ICONOS } from '@/lib/category-icons';
import type { Category } from '@a-la-mano/db';

/** Guard de las operaciones sobre el catálogo global. */
async function assertPlatformAdmin() {
  const admin = await getPlatformAdmin();
  if (!admin) {
    throw new Error('Solo un administrador de la plataforma puede gestionar las categorías.');
  }
  return admin;
}

export interface CategoryGroup {
  groupName: string;
  categories: Category[];
}

/**
 * Los cinco grupos que la UI sabe colorear (ver `lib/category-groups.ts`).
 * Un grupo nuevo no rompe nada, pero cae en el color de "Otros".
 */
export const GRUPOS_CONOCIDOS = [
  'Reparaciones y mantenimiento del hogar',
  'Limpieza y aseo',
  'Exterior y jardín',
  'Servicios para la comunidad / edificio',
  'Otros',
] as const;

const categorySchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto.').max(80),
  groupName: z.string().min(2).max(80),
  /* Se valida contra el catálogo real: un ícono que `ProviderAvatar` no
   * sepa dibujar dejaría la ficha con el genérico sin explicación. */
  iconName: z
    .string()
    .max(40)
    .refine((v) => NOMBRES_DE_ICONOS.includes(v), 'Ese ícono no existe.')
    .nullable()
    .optional(),
  description: z.string().max(300).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export type CategoryInput = z.input<typeof categorySchema>;

/**
 * Slug a partir del nombre: minúsculas, sin tildes, con guiones.
 * Es la clave estable de la categoría — no cambia aunque se renombre.
 */
function slugificar(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export const categoryService = {
  async listAll() {
    return categoryRepository.listAll();
  },

  /**
   * Crea una categoría global. Solo Platform Admin: las categorías las ven
   * todas las comunidades, así que una comunidad no puede ensuciar el
   * catálogo del resto.
   */
  async create(input: CategoryInput) {
    const admin = await assertPlatformAdmin();
    const datos = categorySchema.parse(input);

    const slug = slugificar(datos.name);
    if (!slug) throw new Error('El nombre no genera un identificador válido.');

    const existente = await categoryRepository.getBySlug(slug);
    if (existente) {
      throw new Error(`Ya existe una categoría con el nombre "${existente.name}".`);
    }

    /* Si no se indica orden, va al final del listado. */
    const todas = await categoryRepository.listAll();
    const orden =
      datos.displayOrder ?? Math.max(0, ...todas.map((c) => c.displayOrder)) + 1;

    const categoria = await categoryRepository.create({
      slug,
      name: datos.name,
      groupName: datos.groupName,
      iconName: datos.iconName ?? null,
      description: datos.description ?? null,
      displayOrder: orden,
    });

    await auditService.log({
      tenantId: null,
      userId: admin.id,
      action: 'category.created',
      resourceType: 'category',
      resourceId: categoria.id,
      metadata: { slug, name: datos.name, groupName: datos.groupName },
    });

    return categoria;
  },

  async update(id: string, input: Partial<CategoryInput>) {
    const admin = await assertPlatformAdmin();
    const datos = categorySchema.partial().parse(input);

    /* El slug no se toca al renombrar: ya está en las URLs del directorio
     * de cada comunidad, y cambiarlo rompería enlaces guardados. */
    const categoria = await categoryRepository.update(id, {
      name: datos.name,
      groupName: datos.groupName,
      iconName: datos.iconName ?? undefined,
      description: datos.description ?? undefined,
      displayOrder: datos.displayOrder,
    });

    await auditService.log({
      tenantId: null,
      userId: admin.id,
      action: 'category.updated',
      resourceType: 'category',
      resourceId: id,
      metadata: { cambios: datos },
    });

    return categoria;
  },

  /**
   * Activa o desactiva una categoría. No se borra nunca: hay proveedores
   * apuntando a ella, y una categoría desactivada simplemente deja de
   * ofrecerse al cargar proveedores nuevos.
   */
  async setActiva(id: string, activa: boolean) {
    const admin = await assertPlatformAdmin();
    const categoria = await categoryRepository.update(id, { isActive: activa });

    await auditService.log({
      tenantId: null,
      userId: admin.id,
      action: activa ? 'category.activated' : 'category.deactivated',
      resourceType: 'category',
      resourceId: id,
    });

    return categoria;
  },

  async listActive() {
    return categoryRepository.listActive();
  },

  async listGrouped(): Promise<CategoryGroup[]> {
    const cats = await categoryRepository.listActive();
    const byGroup = new Map<string, Category[]>();
    for (const c of cats) {
      const arr = byGroup.get(c.groupName) ?? [];
      arr.push(c);
      byGroup.set(c.groupName, arr);
    }
    return Array.from(byGroup.entries()).map(([groupName, categories]) => ({
      groupName,
      categories,
    }));
  },

  async getBySlug(slug: string) {
    return categoryRepository.getBySlug(slug);
  },

  /**
   * Los miembros NO pueden crear categorías directamente. Esta función deja
   * registro en el audit log para que un Platform Admin las revise.
   * El tenantId se pasa para mantener el evento dentro del scope de la comunidad
   * que sugiere — útil para métricas de demanda.
   */
  async suggestNewCategory(input: { tenantId: string; name: string; note?: string }) {
    const user = await assertAuthenticated();
    await auditService.log({
      tenantId: input.tenantId,
      userId: user.id,
      action: 'category.suggested',
      resourceType: 'category',
      metadata: { name: input.name, note: input.note },
    });
  },
};
