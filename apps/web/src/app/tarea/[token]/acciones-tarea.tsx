'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CalendarX, Check, Hourglass, PauseCircle, type LucideIcon } from 'lucide-react';
import {
  actualizarTareaPorEnlaceAction,
  cancelarVisitaPorEnlaceAction,
} from '@/server/actions/task.actions';
import { MOTIVOS_CANCELACION, puedeCancelarVisita, type EstadoTarea } from '@/lib/task-types';

interface Props {
  token: string;
  estadoActual: EstadoTarea;
}

/** Qué panel de motivo está abierto, si hay alguno. */
type Panel = 'ninguno' | 'suspender' | 'cancelar';

interface Confirmacion {
  titulo: string;
  detalle: string;
}

/**
 * Los botones con los que quien recibió el enlace mueve la tarea.
 *
 * Botones grandes y pocos: esto se toca de pie, con guantes puestos, en el
 * celular de la portería o en la calle antes de arrancar el carro.
 *
 * Las dos formas de decir que no son distintas y conviene no confundirlas:
 *
 *  - **"No lo puedo hacer"** suspende. El trabajo se frena y la
 *    administración decide qué hace con él.
 *  - **"No voy a poder ir"** cancela la visita y devuelve el pendiente a la
 *    fila. El encargo sigue en pie; lo que se cayó es la ida de hoy.
 *
 * Esa segunda es la única forma en que quien ejecuta devuelve una tarea a
 * "pendiente", y solo desde "en proceso": no está empezando de cero, está
 * retirando el "voy en camino" que dio él mismo.
 */
export function AccionesTarea({ token, estadoActual }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('ninguno');
  const [motivo, setMotivo] = useState('');
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);

  function despuesDeMover(exito: Confirmacion) {
    setConfirmacion(exito);
    setPanel('ninguno');
    setMotivo('');
    router.refresh();
  }

  function mover(estado: string, nota: string | null, exito: Confirmacion) {
    setError(null);
    startTransition(async () => {
      const result = await actualizarTareaPorEnlaceAction(token, estado, nota);
      if (!result.ok) setError(result.error);
      else despuesDeMover(exito);
    });
  }

  function cancelarVisita(razon: string) {
    setError(null);
    startTransition(async () => {
      const result = await cancelarVisitaPorEnlaceAction(token, razon);
      if (!result.ok) setError(result.error);
      else
        despuesDeMover({
          titulo: 'Avisaste que no vas a poder ir.',
          detalle:
            'El pendiente vuelve a la fila con tu motivo. La administración decide si lo reprograma o se lo pasa a alguien más.',
        });
    });
  }

  if (confirmacion) {
    return (
      <div className="superficie px-4 py-6 text-center">
        <div
          aria-hidden
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--color-success)' }}
        >
          <Check className="h-6 w-6 text-white" />
        </div>
        <p className="mt-3 font-medium">{confirmacion.titulo}</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{confirmacion.detalle}</p>
        {/* Sin esto, quien acaba de avisar algo se queda mirando la
            confirmación y no puede corregirse sin recargar la página. */}
        <button
          type="button"
          data-tactil
          onClick={() => setConfirmacion(null)}
          className="foco mt-4 text-sm text-[var(--color-text-secondary)] underline underline-offset-2"
        >
          Volver al pendiente
        </button>
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
          onClick={() =>
            mover('en_proceso', null, {
              titulo: 'Listo, quedó registrado.',
              detalle: 'La administración lo ve al instante. No hace falta avisar por otro lado.',
            })
          }
        />
      )}

      <Boton
        icono={Check}
        label="Ya está hecho"
        destacado
        deshabilitado={isPending}
        onClick={() =>
          mover('resuelto', null, {
            titulo: 'Listo, quedó registrado.',
            detalle: 'La administración lo ve al instante. No hace falta avisar por otro lado.',
          })
        }
      />

      {panel === 'ninguno' && puedeCancelarVisita(estadoActual) && (
        <Boton
          icono={CalendarX}
          label="No voy a poder ir"
          deshabilitado={isPending}
          onClick={() => setPanel('cancelar')}
        />
      )}

      {panel === 'ninguno' && estadoActual !== 'suspendido' && (
        <Boton
          icono={PauseCircle}
          label="No lo puedo hacer"
          deshabilitado={isPending}
          onClick={() => setPanel('suspender')}
        />
      )}

      {panel === 'cancelar' && (
        <PanelMotivo
          titulo="¿Por qué no vas a poder ir?"
          ayuda="El pendiente vuelve a la fila. No se cierra."
          sugerencias={MOTIVOS_CANCELACION}
          placeholder="Contá qué pasó…"
          motivo={motivo}
          onMotivo={setMotivo}
          isPending={isPending}
          onEnviar={() => cancelarVisita(motivo.trim())}
          onCerrar={() => {
            setPanel('ninguno');
            setMotivo('');
          }}
        />
      )}

      {panel === 'suspender' && (
        <PanelMotivo
          titulo="¿Por qué no se puede?"
          ayuda="Esto frena el pendiente hasta que la administración lo revise."
          placeholder="Falta el repuesto, no tengo acceso…"
          motivo={motivo}
          onMotivo={setMotivo}
          isPending={isPending}
          onEnviar={() =>
            mover('suspendido', motivo.trim(), {
              titulo: 'Listo, quedó registrado.',
              detalle:
                'La administración lo ve al instante. No hace falta avisar por otro lado.',
            })
          }
          onCerrar={() => {
            setPanel('ninguno');
            setMotivo('');
          }}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * El motivo, que en los dos casos es obligatorio.
 *
 * Un pendiente frenado o una visita caída sin explicación no le dicen a la
 * administración si tiene que reprogramar, insistir o llamar a otro.
 *
 * Cuando hay sugerencias se tocan en vez de escribirse: esto se responde
 * muchas veces en la calle y con una mano, y si avisar exige teclear, la
 * salida barata vuelve a ser no avisar.
 */
function PanelMotivo({
  titulo,
  ayuda,
  sugerencias,
  placeholder,
  motivo,
  onMotivo,
  isPending,
  onEnviar,
  onCerrar,
}: {
  titulo: string;
  ayuda: string;
  sugerencias?: readonly string[];
  placeholder: string;
  motivo: string;
  onMotivo: (v: string) => void;
  isPending: boolean;
  onEnviar: () => void;
  onCerrar: () => void;
}) {
  const listo = motivo.trim().length > 0;

  return (
    <div className="superficie space-y-3 p-3">
      <div>
        <label htmlFor="motivo" className="text-sm font-medium">
          {titulo}
        </label>
        <p className="text-xs text-[var(--color-text-secondary)]">{ayuda}</p>
      </div>

      {sugerencias && (
        <div className="flex flex-wrap gap-1.5">
          {sugerencias.map((s) => (
            <button
              key={s}
              type="button"
              data-tactil
              aria-pressed={motivo === s}
              onClick={() => onMotivo(s)}
              className={`foco rounded-full border px-3 py-1.5 text-sm transition-colors ${
                motivo === s
                  ? 'border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <input
        id="motivo"
        autoFocus={!sugerencias}
        value={motivo}
        maxLength={300}
        onChange={(e) => onMotivo(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && listo && onEnviar()}
        placeholder={placeholder}
        className="campo h-12 w-full px-3 text-base outline-none focus:border-[var(--color-text-primary)]"
      />

      <div className="flex gap-2">
        <button
          type="button"
          data-tactil
          disabled={isPending || !listo}
          onClick={onEnviar}
          className="foco flex-1 rounded-[var(--radio-panel)] border border-[var(--color-border)] px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
        >
          {isPending ? 'Enviando…' : 'Enviar'}
        </button>
        <button
          type="button"
          data-tactil
          onClick={onCerrar}
          className="foco rounded-[var(--radio-panel)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          Cancelar
        </button>
      </div>
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
      className={`foco flex w-full items-center justify-center gap-2 rounded-[var(--radio-panel)] px-4 py-4 text-base font-medium transition-opacity disabled:opacity-40 ${
        destacado
          ? 'bg-[var(--color-accent-primary)] text-[var(--color-accent-ink)] hover:opacity-90'
          : 'border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
      }`}
    >
      <Icono className="h-5 w-5" aria-hidden />
      {label}
    </button>
  );
}
