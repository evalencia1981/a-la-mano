import { CategoryEditor } from './category-editor';
import { categoryService, GRUPOS_CONOCIDOS } from '@/server/services/category.service';

export const metadata = { title: 'Platform · Categorías' };

export default async function PlatformCategoriesPage() {
  const categorias = await categoryService.listAll();
  const activas = categorias.filter((c) => c.isActive).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Categorías</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {activas} activas de {categorias.length}. Son globales: al crear una, queda disponible
          para todas las comunidades.
        </p>
      </header>

      <CategoryEditor grupos={GRUPOS_CONOCIDOS} categorias={categorias} />
    </div>
  );
}
