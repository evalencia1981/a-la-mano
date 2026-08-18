'use server';

import { revalidatePath } from 'next/cache';
import { categoryService } from '@/server/services/category.service';
import { fail, ok, type ActionResult } from './result';
import type { Category } from '@a-la-mano/db';
import type { CategoryGroup } from '@/server/services/category.service';

export async function listCategoriesAction(): Promise<ActionResult<Category[]>> {
  try {
    return ok(await categoryService.listActive());
  } catch (error) {
    return fail(error);
  }
}

export async function listGroupedCategoriesAction(): Promise<ActionResult<CategoryGroup[]>> {
  try {
    return ok(await categoryService.listGrouped());
  } catch (error) {
    return fail(error);
  }
}

/* --------------------------------------------------------------------------
 * Gestión del catálogo global. Solo Platform Admin — el guard vive en el
 * service, no acá, para que valga desde cualquier punto de entrada.
 * ------------------------------------------------------------------------ */

export async function createCategoryAction(
  formData: FormData,
): Promise<ActionResult<{ category: Category }>> {
  try {
    const category = await categoryService.create({
      name: String(formData.get('name') ?? ''),
      groupName: String(formData.get('groupName') ?? ''),
      iconName: (formData.get('iconName') as string) || null,
      description: (formData.get('description') as string) || null,
    });
    revalidatePath('/platform-admin/categories');
    return ok({ category });
  } catch (error) {
    return fail(error);
  }
}

export async function updateCategoryAction(
  id: string,
  formData: FormData,
): Promise<ActionResult<{ category: Category }>> {
  try {
    const category = await categoryService.update(id, {
      name: String(formData.get('name') ?? ''),
      groupName: String(formData.get('groupName') ?? ''),
      iconName: (formData.get('iconName') as string) || null,
      description: (formData.get('description') as string) || null,
    });
    revalidatePath('/platform-admin/categories');
    return ok({ category });
  } catch (error) {
    return fail(error);
  }
}

export async function setCategoryActiveAction(
  id: string,
  activa: boolean,
): Promise<ActionResult<{ category: Category }>> {
  try {
    const category = await categoryService.setActiva(id, activa);
    revalidatePath('/platform-admin/categories');
    return ok({ category });
  } catch (error) {
    return fail(error);
  }
}

export async function suggestCategoryAction(
  tenantId: string,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    await categoryService.suggestNewCategory({
      tenantId,
      name: String(formData.get('name') ?? ''),
      note: (formData.get('note') as string) || undefined,
    });
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
