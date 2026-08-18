import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export function TrialBanner({ tenantSlug, daysRemaining }: { tenantSlug: string; daysRemaining: number | null }) {
  if (daysRemaining === null) return null;
  if (daysRemaining < 0) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-warning)] bg-[var(--color-warning)]/10 px-4 py-2 text-sm">
        <span className="inline-flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Tu trial venció. Activá la suscripción para reanudar acciones administrativas.
        </span>
        <Link
          href={`/${tenantSlug}/admin/billing`}
          className="font-medium underline"
        >
          Activar
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm">
      <span>Trial activo · quedan {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}.</span>
      <Link href={`/${tenantSlug}/admin/billing`} className="font-medium text-[var(--color-accent-primary)] hover:underline">
        Activar suscripción
      </Link>
    </div>
  );
}

export function PastDueBanner({ tenantSlug }: { tenantSlug: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-error)] bg-[var(--color-error)]/10 px-4 py-2 text-sm">
      <span className="inline-flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        Pago pendiente. La comunidad está en modo solo-lectura.
      </span>
      <Link href={`/${tenantSlug}/admin/billing`} className="font-medium underline">
        Resolver
      </Link>
    </div>
  );
}
