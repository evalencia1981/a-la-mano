'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestMagicLinkAction } from '@/server/actions/auth.actions';

export function MagicLinkForm() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: 'idle' | 'sent' | 'error'; message?: string }>({
    kind: 'idle',
  });

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await requestMagicLinkAction(formData);
      if (result.ok) {
        setStatus({ kind: 'sent' });
      } else {
        setStatus({ kind: 'error', message: result.error });
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email</Label>
        <Input id="magic-email" name="email" type="email" placeholder="tu@email.com" required />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Enviando...' : 'Enviarme el link'}
      </Button>
      {status.kind === 'sent' && (
        <p className="text-sm text-[var(--color-success)]">
          Listo. Revisá tu email y hacé click en el link para entrar.
        </p>
      )}
      {status.kind === 'error' && (
        <p className="text-sm text-[var(--color-error)]">{status.message}</p>
      )}
    </form>
  );
}
