import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProviderCard } from '@/components/provider/provider-card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { categoryService } from '@/server/services/category.service';
import { communityProviderService } from '@/server/services/community-provider.service';

interface Props {
  params: Promise<{ tenantSlug: string; slug: string }>;
}

export default async function CategoryDetailPage({ params }: Props) {
  const { tenantSlug, slug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const category = await categoryService.getBySlug(slug);
  if (!category) notFound();

  const rows = await communityProviderService.listInTenant(current.tenant.id, {
    categoryId: category.id,
    limit: 100,
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link
          href={`/${tenantSlug}/directory/categories`}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Categorías
        </Link>
      </div>
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">{category.name}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {rows.length} {rows.length === 1 ? 'proveedor' : 'proveedores'} en tu comunidad.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
            Todavía no hay proveedores en esta categoría.{' '}
            <Link href={`/${tenantSlug}/suggest`} className="text-[var(--color-accent-primary)] underline">
              Sugerí uno
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <ProviderCard
              key={row.communityProvider.id}
              tenantSlug={tenantSlug}
              communityProvider={row.communityProvider}
              provider={row.provider}
              primaryPhoto={row.primaryPhoto}
              category={category}
            />
          ))}
        </div>
      )}
    </div>
  );
}
