import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { suggestionService } from '@/server/services/suggestion.service';

export const metadata = { title: 'Mis sugerencias' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export default async function MySuggestionsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const suggestions = await suggestionService.listMine(current.tenant.id);

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mis sugerencias</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Estado de los proveedores que sugeriste.
          </p>
        </div>
        <Link
          href={`/${tenantSlug}/suggest`}
          className="text-sm text-[var(--color-accent-primary)] hover:underline"
        >
          Nueva sugerencia
        </Link>
      </header>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
            Todavía no sugeriste ningún proveedor.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-5 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs rounded bg-[var(--color-bg-secondary)] px-2 py-0.5">
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {s.phone} · {s.city}
                  {s.neighborhood ? ` · ${s.neighborhood}` : ''}
                </p>
                {s.status === 'rejected' && s.rejectionReason && (
                  <p className="text-xs text-[var(--color-error)]">
                    Motivo: {s.rejectionReason}
                  </p>
                )}
                {s.status === 'approved' && s.resultingCommunityProviderId && (
                  <Link
                    href={`/${tenantSlug}/directory/provider/${s.resultingCommunityProviderId}`}
                    className="text-xs text-[var(--color-accent-primary)] hover:underline"
                  >
                    Ver en el directorio →
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
