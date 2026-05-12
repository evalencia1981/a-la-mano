'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteMemberAction } from '@/server/actions/member.actions';
import { TENANT_ROLES } from '@/types/role';

export function InviteMemberForm({ tenantId }: { tenantId: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    kind: 'idle' | 'ok' | 'error';
    message?: string;
    token?: string;
  }>({ kind: 'idle' });

  function onSubmit(formData: FormData) {
    setStatus({ kind: 'idle' });
    startTransition(async () => {
      const result = await inviteMemberAction(tenantId, formData);
      if (result.ok) {
        setStatus({ kind: 'ok', token: result.data.token });
      } else {
        setStatus({ kind: 'error', message: result.error });
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-3 items-end">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="persona@empresa.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Rol</Label>
          <select
            id="role"
            name="role"
            defaultValue="member"
            className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm"
          >
            {TENANT_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enviando...' : 'Invitar'}
        </Button>
      </div>
      {status.kind === 'ok' && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm">
          <p className="text-[var(--color-success)] font-medium">Invitación creada.</p>
          {status.token && (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)] break-all">
              Token (compartir manualmente hasta que esté el envío por email):{' '}
              <code>{status.token}</code>
            </p>
          )}
        </div>
      )}
      {status.kind === 'error' && (
        <p className="text-sm text-[var(--color-error)]">{status.message}</p>
      )}
    </form>
  );
}
