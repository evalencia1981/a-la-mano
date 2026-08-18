'use client';

import { useTransition } from 'react';
import { signInWithOAuthAction } from '@/server/actions/auth.actions';

/**
 * Inicia sesión con Google y vuelve a esta misma página de ingreso, que ahí
 * sí encuentra sesión y suma a la persona a la comunidad.
 */
export function IngresarConGoogle({ codigo }: { codigo: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      data-tactil
      disabled={isPending}
      onClick={() =>
        startTransition(() => signInWithOAuthAction('google', `/unirse/${codigo}`))
      }
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3.5 text-[15px] font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
    >
      <GoogleIcon className="h-5 w-5" />
      {isPending ? 'Abriendo Google…' : 'Entrar con Google'}
    </button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.227c0-.701-.063-1.376-.18-2.025H12v3.834h5.385a4.604 4.604 0 0 1-1.999 3.022v2.5h3.235c1.893-1.745 2.98-4.314 2.98-7.331z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.964-.895 6.618-2.442l-3.234-2.5c-.896.6-2.043.955-3.384.955-2.604 0-4.808-1.76-5.595-4.123H3.064v2.585A9.996 9.996 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.405 13.89A6.004 6.004 0 0 1 6.09 12c0-.658.113-1.298.314-1.89V7.525H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.064 4.475l3.341-2.585z"
      />
      <path
        fill="#EA4335"
        d="M12 5.977c1.468 0 2.785.505 3.823 1.496l2.868-2.868C16.96 2.99 14.696 2 12 2A9.996 9.996 0 0 0 3.064 7.525l3.341 2.585C7.192 7.737 9.396 5.977 12 5.977z"
      />
    </svg>
  );
}
