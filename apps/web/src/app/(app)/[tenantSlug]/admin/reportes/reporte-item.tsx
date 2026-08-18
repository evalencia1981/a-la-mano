'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { iconoDe } from '@/lib/category-icons';
import {
  ESTADOS_INCIDENTE,
  tipoIncidente,
  type EstadoIncidente,
} from '@/lib/incident-types';
import { cambiarEstadoReporteAction } from '@/server/actions/incident.actions';
import type { IncidentReport } from '@a-la-mano/db';

/**
 * Un reporte en la bandeja de la administración.
 *
 * Al resolver se pide una nota: es lo que después se convierte en la
 * constancia de qué se hizo, y lo que ve el vecino que reportó. Sin eso,
 * "resuelto" no le dice nada a nadie.
 */
export function ReporteItem({
  tenantId,
  reporte,
  reportante,
}: {
  tenantId: string;
  reporte: IncidentReport;
  reportante: { fullName: string | null; email: string } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resolviendo, setResolviendo] = useState(false);
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tipo = tipoIncidente(reporte.type);
  const Icono = iconoDe(tipo?.icono);
  const esRiesgo = tipo?.gravedad === 'riesgo';

  function cambiar(estado: string, notaTexto?: string) {
    setError(null);
    startTransition(async () => {
      const result = await cambiarEstadoReporteAction(tenantId, reporte.id, estado, notaTexto);
      if (!result.ok) setError(result.error);
      else {
        setResolviendo(false);
        setNota('');
        router.refresh();
      }
    });
  }

  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: esRiesgo ? 'var(--color-urgencia-suave)' : 'var(--color-bg-secondary)',
          }}
        >
          <Icono
            className="h-4 w-4"
            style={{ color: esRiesgo ? 'var(--color-urgencia)' : 'var(--color-text-secondary)' }}
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{tipo?.label ?? reporte.type}</h3>
            {esRiesgo && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  color: 'var(--color-urgencia)',
                  backgroundColor: 'var(--color-urgencia-suave)',
                }}
              >
                Riesgo
              </span>
            )}
          </div>

          <p className="text-sm text-[var(--color-text-secondary)]">
            {reporte.location ? `${reporte.location} · ` : ''}
            {reporte.createdAt.toLocaleString('es-CO', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {reportante && ` · ${reportante.fullName ?? reportante.email}`}
          </p>

          {reporte.description && <p className="mt-2 text-sm">{reporte.description}</p>}

          {reporte.resolutionNote && (
            <p className="mt-2 rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2 text-sm">
              <strong className="font-medium">Se resolvió:</strong> {reporte.resolutionNote}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">
              {error}
            </p>
          )}

          {resolviendo ? (
            <div className="mt-3 space-y-2">
              <label htmlFor={`nota-${reporte.id}`} className="text-sm font-medium">
                ¿Qué se hizo?
              </label>
              <input
                id={`nota-${reporte.id}`}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                maxLength={500}
                autoFocus
                placeholder="Se instaló señalización en la rampa."
                className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm outline-none focus:border-[var(--color-text-primary)]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => cambiar('resuelto', nota)}
                  className="rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Guardando…' : 'Marcar resuelto'}
                </button>
                <button
                  type="button"
                  onClick={() => setResolviendo(false)}
                  className="rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--color-text-secondary)]">
                {ESTADOS_INCIDENTE[reporte.status as EstadoIncidente] ?? reporte.status}
              </span>
              {reporte.status !== 'en_proceso' && reporte.status !== 'resuelto' && (
                <BotonEstado disabled={isPending} onClick={() => cambiar('en_proceso')}>
                  Tomar
                </BotonEstado>
              )}
              {reporte.status !== 'resuelto' && (
                <BotonEstado disabled={isPending} onClick={() => setResolviendo(true)}>
                  Resolver
                </BotonEstado>
              )}
              {reporte.status === 'resuelto' && (
                <BotonEstado disabled={isPending} onClick={() => cambiar('nuevo')}>
                  Reabrir
                </BotonEstado>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function BotonEstado({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
    >
      {children}
    </button>
  );
}
