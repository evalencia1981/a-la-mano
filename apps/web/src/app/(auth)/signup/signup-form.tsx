'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUpWithPasswordAction } from '@/server/actions/auth.actions';

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: 'idle' | 'verify' | 'error'; message?: string }>({
    kind: 'idle',
  });

  function onSubmit(formData: FormData) {
    setStatus({ kind: 'idle' });
    startTransition(async () => {
      const result = await signUpWithPasswordAction(formData);
      if (!result.ok) {
        setStatus({ kind: 'error', message: result.error });
        return;
      }
      if (result.data.requiresVerification) {
        setStatus({ kind: 'verify' });
      } else {
        router.push('/select-tenant?create=true');
        router.refresh();
      }
    });
  }

  if (status.kind === 'verify') {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-[var(--color-success)]">
          ¡Cuenta creada! Revisá tu email y confirmá la dirección para entrar.
        </p>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nombre completo</Label>
        <Input id="fullName" name="fullName" type="text" autoComplete="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {status.kind === 'error' && (
        <p className="text-sm text-[var(--color-error)]">{status.message}</p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Creando...' : 'Crear cuenta'}
      </Button>
    </form>
  );
}
