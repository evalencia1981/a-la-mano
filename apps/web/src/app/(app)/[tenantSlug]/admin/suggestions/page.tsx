import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { SuggestionCard } from '@/components/suggestion/suggestion-card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { suggestionService } from '@/server/services/suggestion.service';

export const metadata = { title: 'Sugerencias pendientes' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AdminSuggestionsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();
  const suggestions = await suggestionService.listPending(current.tenant.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Sugerencias pendientes</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {suggestions.length} {suggestions.length === 1 ? 'sugerencia' : 'sugerencias'} para revisar.
        </p>
      </header>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
            Sin sugerencias pendientes 🎉
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              tenantId={current.tenant.id}
              tenantSlug={tenantSlug}
              suggestion={s}
            />
          ))}
        </div>
      )}
    </div>
  );
}
