import { CategoryTile, type ConteoCategoria } from './category-tile';
import { colorDeGrupo, etiquetaDeGrupo } from '@/lib/category-groups';
import type { CategoryGroup } from '@/server/services/category.service';

/**
 * Grilla de categorías agrupada por tipo de servicio.
 *
 * El orden lo decide lo que la comunidad tiene, no el catálogo: primero los
 * grupos con proveedores cargados y, dentro de cada uno, la categoría con
 * más gente. Las vacías quedan al final, apagadas pero alcanzables — son la
 * lista de lo que a la unidad todavía le falta conseguir.
 *
 * Sin `conteos` (por ejemplo desde una pantalla sin comunidad en contexto)
 * se muestra el catálogo tal cual, en su orden original.
 */
export function CategoryGrid({
  groups,
  tenantSlug,
  conteos,
}: {
  groups: CategoryGroup[];
  tenantSlug: string;
  conteos?: Map<string, ConteoCategoria>;
}) {
  const gruposOrdenados = groups
    .map((g) => {
      const categorias = conteos
        ? [...g.categories].sort(
            (a, b) =>
              (conteos.get(b.id)?.total ?? 0) - (conteos.get(a.id)?.total ?? 0) ||
              a.displayOrder - b.displayOrder,
          )
        : g.categories;
      const total = conteos
        ? categorias.reduce((suma, c) => suma + (conteos.get(c.id)?.total ?? 0), 0)
        : null;
      return { ...g, categories: categorias, total };
    })
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));

  return (
    <div className="space-y-10">
      {gruposOrdenados.map((g) => (
        <section key={g.groupName} className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colorDeGrupo(g.groupName) }}
              />
              {etiquetaDeGrupo(g.groupName)}
            </h2>
            {g.total !== null && g.total > 0 && (
              <span className="tabular text-sm text-[var(--color-text-secondary)]">
                {g.total} {g.total === 1 ? 'proveedor' : 'proveedores'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.categories.map((c) => (
              <CategoryTile
                key={c.id}
                category={c}
                conteo={conteos?.get(c.id)}
                href={`/${tenantSlug}/directory/category/${c.slug}`}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
