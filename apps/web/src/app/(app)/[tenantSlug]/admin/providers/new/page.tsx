import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { categoryService } from '@/server/services/category.service';
import { NewProviderForm } from './new-provider-form';

export const metadata = { title: 'Nuevo proveedor' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function NewProviderPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();
  const categories = await categoryService.listActive();

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agregar proveedor</CardTitle>
          <CardDescription>
            Si ya existe en otra comunidad (matching por teléfono), lo asociamos directo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewProviderForm
            tenantId={current.tenant.id}
            tenantSlug={tenantSlug}
            categories={categories}
          />
        </CardContent>
      </Card>
    </div>
  );
}
