import { CategoryTile } from './category-tile';
import type { CategoryGroup } from '@/server/services/category.service';

export function CategoryGrid({
  groups,
  tenantSlug,
}: {
  groups: CategoryGroup[];
  tenantSlug: string;
}) {
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.groupName} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase text-[var(--color-text-secondary)] tracking-wide">
            {g.groupName}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.categories.map((c) => (
              <CategoryTile
                key={c.id}
                category={c}
                href={`/${tenantSlug}/directory/category/${c.slug}`}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
