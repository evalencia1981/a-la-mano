'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { acceptInvitationAction } from '@/server/actions/member.actions';

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvitationAction(token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/${result.data.tenantSlug}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={accept} disabled={isPending}>
        <Check className="h-4 w-4" />
        {isPending ? 'Aceptando...' : 'Aceptar invitación'}
      </Button>
      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
    </div>
  );
}
