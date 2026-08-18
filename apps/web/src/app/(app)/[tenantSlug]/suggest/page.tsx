import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SuggestionForm } from '@/components/suggestion/suggestion-form';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { categoryService } from '@/server/services/category.service';

export const metadata = { title: 'Sugerir proveedor' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function SuggestPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();
  const categories = await categoryService.listActive();

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sugerir un proveedor</CardTitle>
          <CardDescription>
            Los admins de la comunidad lo revisarán y, si lo aprueban, va al directorio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SuggestionForm
            tenantId={current.tenant.id}
            tenantSlug={tenantSlug}
            categories={categories}
          />
        </CardContent>
      </Card>
    </div>
  );
}
