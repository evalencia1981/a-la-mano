'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, MailOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { acceptInvitationAction } from '@/server/actions/member.actions';
import type { Tenant, TenantInvitation } from '@a-la-mano/db';

interface Props {
  invitations: Array<{ invitation: TenantInvitation; tenant: Tenant }>;
}

export function PendingInvitations({ invitations }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  function accept(invitation: TenantInvitation) {
    setError(null);
    setAcceptingId(invitation.id);
    startTransition(async () => {
      const result = await acceptInvitationAction(invitation.token);
      if (!result.ok) {
        setError(result.error);
        setAcceptingId(null);
        return;
      }
      router.push(`/${result.data.tenantSlug}`);
      router.refresh();
    });
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase text-[var(--color-text-secondary)] tracking-wide flex items-center gap-2">
        <MailOpen className="h-4 w-4" />
        Invitaciones pendientes ({invitations.length})
      </h2>

      <div className="space-y-3">
        {invitations.map(({ invitation, tenant }) => (
          <Card key={invitation.id}>
            <CardContent className="pt-5 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{tenant.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  Rol: {invitation.role}
                </div>
              </div>
              <Button
                onClick={() => accept(invitation)}
                disabled={isPending && acceptingId === invitation.id}
              >
                <Check className="h-4 w-4" />
                {isPending && acceptingId === invitation.id ? 'Aceptando...' : 'Aceptar'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
    </section>
  );
}
