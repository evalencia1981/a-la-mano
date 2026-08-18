'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { approveSuggestionAction, rejectSuggestionAction } from '@/server/actions/suggestion.actions';
import type { Suggestion } from '@a-la-mano/db';

export function SuggestionCard({
  tenantId,
  tenantSlug,
  suggestion,
}: {
  tenantId: string;
  tenantSlug: string;
  suggestion: Suggestion;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  function approve() {
    setError(null);
    startTransition(async () => {
      const result = await approveSuggestionAction(tenantId, suggestion.id);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.push(`/${tenantSlug}/directory/provider/${result.data.communityProviderId}`);
      }
    });
  }

  function reject() {
    setError(null);
    if (!reason.trim()) {
      setError('Indicá un motivo.');
      return;
    }
    startTransition(async () => {
      const result = await rejectSuggestionAction(tenantId, suggestion.id, reason);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div>
          <h4 className="font-semibold">{suggestion.name}</h4>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {suggestion.phone} · {suggestion.city}
            {suggestion.neighborhood ? ` · ${suggestion.neighborhood}` : ''}
          </p>
        </div>
        {suggestion.description && (
          <p className="text-sm">{suggestion.description}</p>
        )}
        {suggestion.memberNote && (
          <p className="text-xs italic text-[var(--color-text-secondary)]">
            Nota del miembro: {suggestion.memberNote}
          </p>
        )}

        {rejecting ? (
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo del rechazo (lo verá quien sugirió)"
              rows={2}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={reject} disabled={isPending}>
                Confirmar rechazo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={approve} disabled={isPending}>
              <Check className="h-4 w-4" />
              Aprobar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={isPending}>
              <X className="h-4 w-4" />
              Rechazar
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      </CardContent>
    </Card>
  );
}
