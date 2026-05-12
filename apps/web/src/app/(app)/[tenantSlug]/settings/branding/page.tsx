import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { BrandingForm } from './branding-form';

export const metadata = { title: 'Branding' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function BrandingPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const canEdit = current.role === 'owner' || current.role === 'admin';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Branding</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Logo y colores que se aplican al área autenticada de esta organización.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Identidad visual</CardTitle>
          <CardDescription>
            Los cambios impactan a todos los miembros de inmediato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingForm tenant={current.tenant} disabled={!canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
