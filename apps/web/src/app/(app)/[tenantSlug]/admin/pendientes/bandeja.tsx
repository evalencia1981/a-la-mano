'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Copy, MapPin, Send, X } from 'lucide-react';
import { COLOR_ESTADO, ESTADOS_TAREA, type EstadoTarea } from '@/lib/task-types';
import {
  asignarTareaAction,
  cambiarEstadoTareaAction,
  despacharTareaAction,
} from '@/server/actions/task.actions';

interface PuestoVista {
  id: string;
  name: string;
  tieneWhatsapp: boolean;
}

interface FilaVista {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  createdAt: string;
  puesto: { id: string; name: string } | null;
}

interface Props {
  tenantId: string;
  puestos: PuestoVista[];
  filas: FilaVista[];
  vacioPorFiltro: boolean;
}

export function Bandeja({ tenantId, puestos, filas, vacioPorFiltro }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  /** El enlace recién generado, para copiarlo si el puesto no tiene WhatsApp. */
  const [enlace, setEnlace] = useState<{ tareaId: string; url: string } | null>(null);

  function ejecutar(accion: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await accion();
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function despachar(tareaId: string, puestoId: string) {
    setError(null);
    startTransition(async () => {
      const result = await despacharTareaAction(tenantId, tareaId, puestoId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      /* Si hay número, se abre WhatsApp con el mensaje ya escrito — el envío
         lo hace la persona. Si no, queda el enlace para copiar y pegarlo
         donde sea. */
      if (result.data.urlWhatsapp) window.open(result.data.urlWhatsapp, '_blank', 'noopener');
      else setEnlace({ tareaId, url: result.data.enlace });
      router.refresh();
    });
  }

  if (filas.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
        {vacioPorFiltro ? 'Hoy no metiste ningún pendiente.' : 'Todavía no hay pendientes.'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--color-error)] px-3 py-2 text-sm text-[var(--color-error)]"
        >
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {filas.map((f) => (
          <TareaItem
            key={f.id}
            fila={f}
            puestos={puestos}
            deshabilitado={isPending}
            enlace={enlace?.tareaId === f.id ? enlace.url : null}
            onCerrarEnlace={() => setEnlace(null)}
            onCambiarEstado={(estado, nota) =>
              ejecutar(() => cambiarEstadoTareaAction(tenantId, f.id, estado, nota))
            }
            onAsignar={(puestoId) => ejecutar(() => asignarTareaAction(tenantId, f.id, puestoId))}
            onDespachar={(puestoId) => despachar(f.id, puestoId)}
          />
        ))}
      </ul>
    </div>
  );
}

function TareaItem({
  fila,
  puestos,
  deshabilitado,
  enlace,
  onCerrarEnlace,
  onCambiarEstado,
  onAsignar,
  onDespachar,
}: {
  fila: FilaVista;
  puestos: PuestoVista[];
  deshabilitado: boolean;
  enlace: string | null;
  onCerrarEnlace: () => void;
  onCambiarEstado: (estado: string, nota?: string | null) => void;
  onAsignar: (puestoId: string | null) => void;
  onDespachar: (puestoId: string) => void;
}) {
  const [suspendiendo, setSuspendiendo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [eligiendoPuesto, setEligiendoPuesto] = useState(false);

  const estado = (fila.status in ESTADOS_TAREA ? fila.status : 'pendiente') as EstadoTarea;
  const resuelto = estado === 'resuelto';
  const fecha = new Date(fila.createdAt);

  return (
    <li
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 ${
        resuelto ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: COLOR_ESTADO[estado] }}
        />
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${resuelto ? 'line-through' : ''}`}>{fila.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--color-text-secondary)]">
            <span>{ESTADOS_TAREA[estado]}</span>
            {fila.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden />
                {fila.location}
              </span>
            )}
            <span>
              {fila.puesto ? fila.puesto.name : 'Sin asignar'}
            </span>
            <span>
              {fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
            </span>
          </p>
          {fila.description && (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{fila.description}</p>
          )}
        </div>
      </div>

      {/* El enlace queda a la vista solo cuando el puesto no tiene WhatsApp
          cargado: ahí no hay a dónde abrirlo y hay que poder copiarlo. */}
      {enlace && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2">
          <code className="min-w-0 flex-1 truncate text-xs">{enlace}</code>
          <button
            type="button"
            data-tactil
            onClick={() => navigator.clipboard?.writeText(enlace)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:bg-[var(--color-bg-primary)]"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            Copiar
          </button>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onCerrarEnlace}
            className="rounded p-1 hover:bg-[var(--color-bg-primary)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}

      {suspendiendo && (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            value={motivo}
            maxLength={300}
            onChange={(e) => setMotivo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || !motivo.trim()) return;
              onCambiarEstado('suspendido', motivo.trim());
              setSuspendiendo(false);
              setMotivo('');
            }}
            placeholder="¿Por qué se suspende?"
            aria-label="Motivo de la suspensión"
            className="h-10 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm outline-none focus:border-[var(--color-text-primary)]"
          />
          <button
            type="button"
            data-tactil
            disabled={deshabilitado || !motivo.trim()}
            onClick={() => {
              onCambiarEstado('suspendido', motivo.trim());
              setSuspendiendo(false);
              setMotivo('');
            }}
            className="rounded-lg border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
          >
            Suspender
          </button>
        </div>
      )}

      {eligiendoPuesto && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {puestos.map((p) => (
            <button
              key={p.id}
              type="button"
              data-tactil
              disabled={deshabilitado}
              onClick={() => {
                onDespachar(p.id);
                setEligiendoPuesto(false);
              }}
              className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-sm hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
            >
              {p.name}
              {!p.tieneWhatsapp && ' (sin WhatsApp)'}
            </button>
          ))}
        </div>
      )}

      {!resuelto && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {estado !== 'en_proceso' && (
            <Accion
              deshabilitado={deshabilitado}
              onClick={() => onCambiarEstado('en_proceso')}
              label="En proceso"
            />
          )}
          {estado !== 'suspendido' && (
            <Accion
              deshabilitado={deshabilitado}
              onClick={() => setSuspendiendo((v) => !v)}
              label="Suspender"
            />
          )}
          <Accion
            deshabilitado={deshabilitado}
            onClick={() => onCambiarEstado('resuelto')}
            label="Resuelto"
          />

          {puestos.length > 0 && (
            <button
              type="button"
              data-tactil
              disabled={deshabilitado}
              onClick={() => {
                /* Si ya tiene puesto, se despacha directo; si no, primero hay
                   que elegir a quién. */
                if (fila.puesto) onDespachar(fila.puesto.id);
                else setEligiendoPuesto((v) => !v);
              }}
              className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
              Despachar
            </button>
          )}

          {fila.puesto && (
            <Accion
              deshabilitado={deshabilitado}
              onClick={() => onAsignar(null)}
              label="Quitar asignación"
            />
          )}
        </div>
      )}
    </li>
  );
}

function Accion({
  label,
  onClick,
  deshabilitado,
}: {
  label: string;
  onClick: () => void;
  deshabilitado: boolean;
}) {
  return (
    <button
      type="button"
      data-tactil
      disabled={deshabilitado}
      onClick={onClick}
      className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-sm transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
    >
      {label}
    </button>
  );
}
