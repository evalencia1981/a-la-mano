import { notFound } from 'next/navigation';
import { CategoryGrid } from '@/components/category/category-grid';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { categoryService } from '@/server/services/category.service';
import { communityProviderService } from '@/server/services/community-provider.service';

export const metadata = { title: 'Categorías' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CategoriesPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  /* El catálogo es global y el conteo es de esta comunidad: dos consultas
   * distintas que la grilla cruza por id de categoría. */
  const [groups, conteos] = await Promise.all([
    categoryService.listGrouped(),
    communityProviderService.countByCategoryInTenant(current.tenant.id),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Buscar por categoría</h1>
        <p className="mt-1 text-[var(--color-text-secondary)]">
          Elegí el tipo de servicio que necesitás.
        </p>
      </header>

      <CategoryGrid groups={groups} tenantSlug={tenantSlug} conteos={conteos} />
    </div>
  );
}
