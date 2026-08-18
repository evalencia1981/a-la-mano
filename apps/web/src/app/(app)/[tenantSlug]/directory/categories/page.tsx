import { notFound } from 'next/navigation';
import { CategoryGrid } from '@/components/category/category-grid';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { categoryService } from '@/server/services/category.service';

export const metadata = { title: 'Categorías' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CategoriesPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const groups = await categoryService.listGrouped();

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <h1 className="text-2xl font-semibold">Buscar por categoría</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Elegí el tipo de servicio que necesitás.
        </p>
      </header>
      <CategoryGrid groups={groups} tenantSlug={tenantSlug} />
    </div>
  );
}
