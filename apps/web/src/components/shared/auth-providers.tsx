'use client';

import { useTransition } from 'react';
import { Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signInWithOAuthAction } from '@/server/actions/auth.actions';

/**
 * Botones de OAuth (Google + GitHub). El click llama una Server Action
 * que devuelve un redirect — el browser sigue la URL de Supabase.
 */
export function AuthProviders() {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => signInWithOAuthAction('google'))}
      >
        <GoogleIcon className="h-4 w-4" />
        Google
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => signInWithOAuthAction('github'))}
      >
        <Github className="h-4 w-4" />
        GitHub
      </Button>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.6 12.227c0-.701-.063-1.376-.18-2.025H12v3.834h5.385a4.604 4.604 0 0 1-1.999 3.022v2.5h3.235c1.893-1.745 2.98-4.314 2.98-7.331z" />
      <path d="M12 22c2.7 0 4.964-.895 6.618-2.442l-3.234-2.5c-.896.6-2.043.955-3.384.955-2.604 0-4.808-1.76-5.595-4.123H3.064v2.585A9.996 9.996 0 0 0 12 22z" />
      <path d="M6.405 13.89A6.004 6.004 0 0 1 6.09 12c0-.658.113-1.298.314-1.89V7.525H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.064 4.475l3.341-2.585z" />
      <path d="M12 5.977c1.468 0 2.785.505 3.823 1.496l2.868-2.868C16.96 2.99 14.696 2 12 2A9.996 9.996 0 0 0 3.064 7.525l3.341 2.585C7.192 7.737 9.396 5.977 12 5.977z" />
    </svg>
  );
}
