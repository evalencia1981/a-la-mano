import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantDashboardPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold">Bienvenido a {current.tenant.name}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Tu rol acá: <strong>{current.role}</strong>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Empezá a construir features</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--color-text-secondary)] space-y-3">
          <p>
            Este es el dashboard placeholder del template. Cuando arranques tu
            proyecto, reemplazá este componente con el primer feature de negocio.
          </p>
          <p>
            La auth, el branding por tenant, los roles y el audit log ya están
            funcionando — no tenés que tocar nada de eso para empezar.
          </p>
          <p>
            Para agregar un feature nuevo, seguí{' '}
            <code className="rounded bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-xs">
              docs/03-adding-a-feature.md
            </code>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
