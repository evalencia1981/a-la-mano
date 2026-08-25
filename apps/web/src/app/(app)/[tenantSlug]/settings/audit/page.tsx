import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { auditService } from '@/server/services/audit.service';

export const metadata = { title: 'Audit log' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AuditPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const entries = await auditService.list(current.tenant.id, 200);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Últimas {entries.length} acciones registradas en esta organización.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Sin actividad aún.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="py-2 font-medium">Fecha</th>
                    <th className="py-2 font-medium">Acción</th>
                    <th className="py-2 font-medium">Recurso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2 text-xs text-[var(--color-text-secondary)]">
                        {entry.createdAt.toISOString()}
                      </td>
                      <td className="py-2">
                        <code className="rounded bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-xs">
                          {entry.action}
                        </code>
                      </td>
                      <td className="py-2 text-xs text-[var(--color-text-secondary)]">
                        {entry.resourceType && entry.resourceId
                          ? `${entry.resourceType}:${entry.resourceId}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
