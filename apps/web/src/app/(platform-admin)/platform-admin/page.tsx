import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db, tenants, providers, communityProviders } from '@a-la-mano/db';
import { sql } from 'drizzle-orm';

export const metadata = { title: 'Métricas globales' };

async function loadMetrics() {
  const [tenantCount, providerCount, associationCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(tenants),
    db.select({ count: sql<number>`count(*)::int` }).from(providers),
    db.select({ count: sql<number>`count(*)::int` }).from(communityProviders),
  ]);
  return {
    tenants: tenantCount[0]?.count ?? 0,
    providers: providerCount[0]?.count ?? 0,
    associations: associationCount[0]?.count ?? 0,
  };
}

export default async function PlatformMetricsPage() {
  const m = await loadMetrics();
  const metrics = [
    { label: 'Tenants totales', value: m.tenants },
    { label: 'Providers globales', value: m.providers },
    { label: 'Asociaciones tenant-provider', value: m.associations },
  ];
  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold">Métricas globales</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Vista cross-tenant de la plataforma.
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm text-[var(--color-text-secondary)] font-medium">
                {m.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
