'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Copy, Link2, RefreshCw } from 'lucide-react';
import {
  rotateJoinCodeAction,
  setJoinCodeEnabledAction,
} from '@/server/actions/member.actions';

/**
 * Enlace de ingreso de la comunidad, para pegar en el grupo del edificio.
 *
 * Es el camino real por el que entran los residentes: invitar de a un correo
 * no escala a ochenta apartamentos, y además exige que el correo coincida
 * exacto con el de la cuenta de Google.
 */
export function JoinLink({
  tenantId,
  codigo,
  habilitado,
}: {
  tenantId: string;
  codigo: string | null;
  habilitado: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Se arma en el cliente para que sirva tal cual esté abierta la app:
   * en localhost durante el desarrollo, con el dominio real en producción. */
  const enlace = codigo
    ? `${typeof window === 'undefined' ? '' : window.location.origin}/unirse/${codigo}`
    : '';

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar. Seleccioná el enlace y copialo a mano.');
    }
  }

  function rotar() {
    if (!confirm('El enlace actual va a dejar de funcionar. ¿Generar uno nuevo?')) return;
    setError(null);
    startTransition(async () => {
      const result = await rotateJoinCodeAction(tenantId);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function alternar() {
    setError(null);
    startTransition(async () => {
      const result = await setJoinCodeEnabledAction(tenantId, !habilitado);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  if (!codigo) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Esta comunidad todavía no tiene enlace de ingreso.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radio-control)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5">
          <Link2 className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
          <code className="truncate text-sm">{enlace}</code>
        </div>
        <button
          type="button"
          data-tactil
          onClick={copiar}
          className="flex shrink-0 items-center justify-center gap-2 rounded-[var(--radio-control)] bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-accent-ink)] transition-opacity hover:opacity-90 foco"
        >
          {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <p className="text-sm text-[var(--color-text-secondary)]">
        {habilitado
          ? 'Pegalo en el grupo de WhatsApp del edificio. Quien lo abra entra con su cuenta de Google y queda como miembro.'
          : 'El ingreso por enlace está cerrado: nadie nuevo puede entrar por acá.'}
      </p>

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={rotar}
          disabled={isPending}
          className="flex items-center gap-2 rounded-[var(--radio-control)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 foco"
        >
          <RefreshCw className="h-4 w-4" />
          Generar enlace nuevo
        </button>
        <button
          type="button"
          onClick={alternar}
          disabled={isPending}
          className="rounded-[var(--radio-control)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 foco"
        >
          {habilitado ? 'Cerrar ingreso por enlace' : 'Reabrir ingreso por enlace'}
        </button>
      </div>

      <p className="text-xs text-[var(--color-text-secondary)]">
        Si el enlace se comparte fuera del edificio, generá uno nuevo: el anterior deja de
        funcionar al instante y quienes ya entraron no se ven afectados.
      </p>
    </div>
  );
}
