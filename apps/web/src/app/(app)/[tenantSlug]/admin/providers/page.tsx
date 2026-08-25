import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProviderCard } from '@/components/provider/provider-card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { categoryService } from '@/server/services/category.service';
import { communityProviderService } from '@/server/services/community-provider.service';

export const metadata = { title: 'Admin · Proveedores' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AdminProvidersPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const [rows, categorias] = await Promise.all([
    communityProviderService.listInTenantAdmin(current.tenant.id),
    categoryService.listActive(),
  ]);
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Proveedores</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {rows.length} en total (incluye desactivados).
          </p>
        </div>
        <Button asChild>
          <Link href={`/${tenantSlug}/admin/providers/new`}>
            <Plus className="h-4 w-4" />
            Agregar proveedor
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
            Sin proveedores todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <div key={row.communityProvider.id} className="relative">
              <ProviderCard
                tenantSlug={tenantSlug}
                /* Desde administración, la ficha lleva a editar, no a la
                   vista del vecino. */
                href={`/${tenantSlug}/admin/providers/${row.communityProvider.id}`}
                communityProvider={row.communityProvider}
                provider={row.provider}
                primaryPhoto={row.primaryPhoto}
                category={categoriaPorId.get(row.provider.categoryId) ?? null}
              />
              {!row.communityProvider.isActive && (
                <span className="absolute right-2 top-2 rounded bg-[var(--color-error)] px-2 py-0.5 text-xs text-white">
                  Inactivo
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
