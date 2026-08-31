'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Hourglass, PauseCircle, type LucideIcon } from 'lucide-react';
import { actualizarTareaPorEnlaceAction } from '@/server/actions/task.actions';
import type { EstadoTarea } from '@/lib/task-types';

interface Props {
  token: string;
  estadoActual: EstadoTarea;
}

/**
 * Los tres botones con los que quien recibió el enlace mueve la tarea.
 *
 * No puede devolverla a "pendiente": empezar de cero es una decisión de la
 * administración, no de quien la está ejecutando. Suspender pide motivo,
 * porque un pendiente frenado sin explicación es un pendiente perdido con
 * mejor nombre.
 *
 * Botones grandes y tres nada más: esto se toca de pie, con guantes puestos,
 * en el celular de la portería.
 */
export function AccionesTarea({ token, estadoActual }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [suspendiendo, setSuspendiendo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [listo, setListo] = useState(false);

  function mover(estado: string, nota?: string) {
    setError(null);
    startTransition(async () => {
      const result = await actualizarTareaPorEnlaceAction(token, estado, nota ?? null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setListo(true);
      setSuspendiendo(false);
      setMotivo('');
      router.refresh();
    });
  }

  if (listo) {
    return (
      <div className="rounded-[var(--radio-panel)] border border-[var(--color-border)] px-4 py-6 text-center">
        <div
          aria-hidden
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--color-success)' }}
        >
          <Check className="h-6 w-6 text-white" />
        </div>
        <p className="mt-3 font-medium">Listo, quedó registrado.</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          La administración lo ve al instante. No hace falta avisar por otro lado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {estadoActual !== 'en_proceso' && (
        <Boton
          icono={Hourglass}
          label="Voy en camino"
          deshabilitado={isPending}
          onClick={() => mover('en_proceso')}
        />
      )}

      <Boton
        icono={Check}
        label="Ya está hecho"
        destacado
        deshabilitado={isPending}
        onClick={() => mover('resuelto')}
      />

      {!suspendiendo && estadoActual !== 'suspendido' && (
        <Boton
          icono={PauseCircle}
          label="No lo puedo hacer"
          deshabilitado={isPending}
          onClick={() => setSuspendiendo(true)}
        />
      )}

      {suspendiendo && (
        <div className="space-y-2 rounded-[var(--radio-panel)] border border-[var(--color-border)] p-3">
          <label htmlFor="motivo" className="text-sm font-medium">
            ¿Por qué no se puede?
          </label>
          <input
            id="motivo"
            autoFocus
            value={motivo}
            maxLength={300}
            onChange={(e) => setMotivo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && motivo.trim() && mover('suspendido', motivo.trim())}
            placeholder="Falta el repuesto, no tengo acceso…"
            className="h-12 w-full campo px-3 text-base outline-none focus:border-[var(--color-text-primary)]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              data-tactil
              disabled={isPending || !motivo.trim()}
              onClick={() => mover('suspendido', motivo.trim())}
              className="flex-1 rounded-[var(--radio-panel)] border border-[var(--color-border)] px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
            >
              Enviar
            </button>
            <button
              type="button"
              data-tactil
              onClick={() => setSuspendiendo(false)}
              className="rounded-[var(--radio-panel)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}

function Boton({
  icono: Icono,
  label,
  onClick,
  deshabilitado,
  destacado = false,
}: {
  icono: LucideIcon;
  label: string;
  onClick: () => void;
  deshabilitado: boolean;
  destacado?: boolean;
}) {
  return (
    <button
      type="button"
      data-tactil
      disabled={deshabilitado}
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-[var(--radio-panel)] px-4 py-4 text-base font-medium transition-opacity disabled:opacity-40 ${
        destacado
          ? 'bg-[var(--color-accent-primary)] text-white hover:opacity-90'
          : 'border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
      }`}
    >
      <Icono className="h-5 w-5" aria-hidden />
      {label}
    </button>
  );
}
